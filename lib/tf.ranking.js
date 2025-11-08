import * as util from "./util.js";

// Track the current training session to allow aborting
let currentTrainingId = 0;

export async function rankingFrom(matches) {
  if (matches.length === 0) {
    return [];
  }
  const players = util.allPlayers(matches);
  const xFree = tf.variable(tf.zeros([players.length - 1], "float32"));

  // Increment training ID to abort any previous training
  currentTrainingId++;
  const thisTrainingId = currentTrainingId;

  return await trainModel(xFree, matches, players, thisTrainingId);
}

function getFullX(xFreeVar) {
  return tf.tidy(() => {
    const sumOfFree = xFreeVar.sum();
    return tf.concat([xFreeVar, sumOfFree.neg().expandDims(0)], 0);
  });
}

function negativeLogLikelihood(xFree, matches, players) {
  return tf.tidy(() => {
    const xAll = getFullX(xFree);

    // We accumulate the negative log-likelihood across all matches
    let totalNegLogLik = tf.scalar(0, "float32");

    matches.forEach((match) => {
      // Gather indices for all home and away players
      const homeIndices = match.home.map((player) => players.indexOf(player));
      const awayIndices = match.away.map((player) => players.indexOf(player));

      // Sum skill values for all players on each team
      const homeSkills = xAll.gather(homeIndices);
      const awaySkills = xAll.gather(awayIndices);
      const xi = homeSkills.sum();
      const xj = awaySkills.sum();

      // logistic difference: sigma(xi - xj)
      const diff = xi.sub(xj); // scalar
      const p = diff.sigmoid(); // scalar, in [0,1]

      // match likelihood ~ p^A * (1-p)^B
      // So log-likelihood ~ A*log(p) + B*log(1-p)
      // We'll compute negative log-likelihood.

      match.games.forEach((game) => {
        // Use max(..., 1e-9) or something to avoid log(0).
        const eps = tf.scalar(1e-10);
        const logP = p.add(eps).log().mul(Math.max(0.1, game.home));
        const logOneMinusP = p
          .neg()
          .add(1)
          .add(eps)
          .log()
          .mul(Math.max(0.1, game.away));
        const gameNegLogLik = logP.add(logOneMinusP).neg(); // negative sign
        totalNegLogLik = totalNegLogLik.add(gameNegLogLik);
        logP.dispose();
        logOneMinusP.dispose();
        gameNegLogLik.dispose();
      });
      homeSkills.dispose();
      awaySkills.dispose();
      xi.dispose();
      xj.dispose();
      diff.dispose();
      p.dispose();
    });

    return totalNegLogLik;
  });
}

async function trainModel(xFree, matches, players, trainingId) {
  // We'll pick an Adam optimizer with some learning rate
  const learningRate = 0.1;
  const optimizer = tf.train.adam(learningRate);

  let step = 0;
  let prevCost = Infinity;
  const tolerance = 1e-6; // Convergence threshold
  const maxIterations = 10000; // Safety limit
  const checkInterval = 10; // Check convergence every N steps

  while (step < maxIterations) {
    // Check if this training has been aborted by a new one
    if (trainingId !== currentTrainingId) {
      console.log(`Training aborted at step ${step} (new training started)`);
      optimizer.dispose();
      return;
    }

    // Minimizing the function: negativeLogLikelihood
    optimizer.minimize(
      () => negativeLogLikelihood(xFree, matches, players),
      /* returnCost */ false
    );

    // Check convergence periodically
    if (step % checkInterval === 0) {
      const cost = negativeLogLikelihood(xFree, matches, players);
      const currentCost = cost.dataSync()[0];

      console.log(`Step ${step}, NLL = ${currentCost.toFixed(4)}`);

      // Check if converged
      const costChange = Math.abs(prevCost - currentCost);
      if (costChange < tolerance) {
        console.log(
          `Converged at step ${step} (change: ${costChange.toExponential(2)})`
        );
        cost.dispose();
        break;
      }

      prevCost = currentCost;
      cost.dispose();
    }

    step++;
    // tf.nextFrame() if you want to keep the UI responsive in the browser,
    // or do whatever scheduling you prefer
    await tf.nextFrame();
  }

  // Check one more time if aborted before printing final results
  if (trainingId !== currentTrainingId) {
    console.log(`Training aborted after loop (new training started)`);
    optimizer.dispose();
    return [];
  }

  optimizer.dispose();

  if (step >= maxIterations) {
    console.log("Training stopped: max iterations reached.");
  } else {
    console.log("Training complete.");
  }

  // Now let's see the final skills:
  const xAll = getFullX(xFree);
  const finalXVals = await xAll.data();
  // console.log("Final log-skills:", finalXVals);
  xAll.dispose();

  return players.map((player, index) => ({
    player: player,
    performance: Math.exp(finalXVals[index]),
  }));
}
