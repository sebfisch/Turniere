import * as util from "./util.js";

// Track the current training session to allow aborting
let currentTrainingId = 0;

export async function rankingFrom(matches) {
  if (matches.length === 0) {
    return [];
  }
  const players = util.allPlayers(matches);
  const skillVars = tf.variable(tf.zeros([players.length], "float32"));

  // Increment training ID to abort any previous training
  currentTrainingId++;
  const thisTrainingId = currentTrainingId;

  return await trainModel(skillVars, matches, players, thisTrainingId);
}

function negativeLogLikelihood(skillVars, compiled) {
  return tf.tidy(() => {
    // We accumulate the negative log-likelihood across all matches
    let total = tf.scalar(0, "float32");

    for (const match of compiled) {
      const homeSkills = skillVars.gather(match.homeIdx);
      const awaySkills = skillVars.gather(match.awayIdx);
      const diff = homeSkills.sum().sub(awaySkills.sum()); // scalar

      for (const game of match.games) {
        const A = tf.scalar(game.home, "float32");
        const B = tf.scalar(game.away, "float32");

        total = tf.tidy(() => {
          const totalPoints = tf.add(A, B);
          const nll = totalPoints.mul(tf.softplus(diff)).sub(A.mul(diff));
          const next = total.add(nll);
          total.dispose();
          return next;
        });

        A.dispose();
        B.dispose();
      }

      homeSkills.dispose();
      awaySkills.dispose();
      diff.dispose();
    }

    return total;
  });
}

function nllWithPrior(skillVars, compiled, lambda = 1e-2) {
  return tf.tidy(() => {
    const nll = negativeLogLikelihood(skillVars, compiled);
    const reg = skillVars.square().sum().mul(lambda);
    return nll.add(reg);
  });
}

function subtractMean(skillVars) {
  const m = skillVars.mean();
  skillVars.assign(skillVars.sub(m));
  m.dispose();
}

async function trainModel(skillVars, matches, players, trainingId) {
  const learningRate = 0.05;
  const optimizer = tf.train.adam(learningRate);

  // Precompile indices once
  const indexOf = new Map(players.map((p, i) => [p, i]));
  const compiled = matches.map((m) => ({
    homeIdx: m.home.map((p) => indexOf.get(p)),
    awayIdx: m.away.map((p) => indexOf.get(p)),
    games: m.games,
  }));

  let step = 0;
  let prevL = Infinity;
  let emaG = Infinity;
  const tolAbs = 1e-7;
  const tolRel = 1e-6;
  const tolGrad = 1e-3;
  const maxIterations = 10000; // Safety limit
  const probeEvery = 50; // Check convergence every N steps
  const yieldEvery = 10; // Yield to event loop every N steps

  try {
    while (step < maxIterations) {
      // Check if this training has been aborted by a new one
      if (trainingId !== currentTrainingId) {
        console.log(`Training aborted at step ${step} (new training started)`);
        return [];
      }
      // Use translation invariance to speed up zero centering
      subtractMean(skillVars);
      // Minimize the negative log-likelihood
      const { value: lossT, grads } = optimizer.computeGradients(
        () => nllWithPrior(skillVars, compiled),
        [skillVars]
      );
      optimizer.applyGradients(grads);

      const [L] = await lossT.data();
      const gT = grads[skillVars.id] || grads[skillVars.name];
      const [gNorm] = await gT.square().sum().sqrt().data();
      const beta = 0.9;
      emaG = isFinite(emaG) ? beta * emaG + (1 - beta) * gNorm : gNorm;
      const dAbs = Math.abs(prevL - L);
      const dRel = dAbs / (Math.abs(prevL) + 1e-12);
      if (dAbs < tolAbs && dRel < tolRel && emaG < tolGrad) {
        console.log(
          `Converged at step ${step} (NLL=${L.toFixed(
            6
          )}, dAbs: ${dAbs.toExponential(2)}, dRel: ${dRel.toExponential(
            2
          )}, emaG: ${emaG.toExponential(2)})`
        );
        break;
      }
      prevL = L;

      lossT.dispose();
      Object.values(grads).forEach((t) => t.dispose());

      step++;
      if (step % yieldEvery === 0) await tf.nextFrame();
      if (step % probeEvery === 0) {
        console.log(
          `Step ${step}: NLL=${L.toFixed(6)}, emaG=${emaG.toExponential(2)}`
        );
      }
    }

    // Check one more time if aborted before printing final results
    if (trainingId !== currentTrainingId) {
      console.log(`Training aborted after loop (new training started)`);
      return [];
    }

    if (step >= maxIterations) {
      console.log("Training stopped: max iterations reached.");
    } else {
      console.log("Training complete.");
    }
  } finally {
    optimizer.dispose();
  }

  // Now let's see the final skills:
  const finalXVals = await skillVars.data();
  skillVars.dispose();

  // console.log(finalXVals.reduce((a, b) => a + b, 0));

  return players.map((player, i) => ({
    player: player,
    performance: Math.exp(finalXVals[i]),
  }));
}
