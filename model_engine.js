function linear(x, weight, bias) {
  const out = new Array(weight.length).fill(0);
  for (let i = 0; i < weight.length; i++) {
    let sum = bias[i];
    for (let j = 0; j < x.length; j++) sum += weight[i][j] * x[j];
    out[i] = sum;
  }
  return out;
}

function batchNormEval(x, w) {
  const eps = 1e-5;
  return x.map((v, i) => ((v - w.running_mean[i]) / Math.sqrt(w.running_var[i] + eps)) * w.weight[i] + w.bias[i]);
}

function relu(x) {
  return x.map(v => Math.max(0, v));
}

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function survivalRiskForward(ageYears, sexFemale, episodeNumber) {
  const W = SURVIVAL_MODEL_WEIGHTS;
  const mean = W._scaler_mean, scale = W._scaler_scale;
  let x = [ageYears, sexFemale, episodeNumber].map((v, i) => (v - mean[i]) / scale[i]);

  x = linear(x, W["net.0.weight"], W["net.0.bias"]);
  x = batchNormEval(x, { weight: W["net.1.weight"], bias: W["net.1.bias"], running_mean: W["net.1.running_mean"], running_var: W["net.1.running_var"] });
  x = relu(x);

  x = linear(x, W["net.4.weight"], W["net.4.bias"]);
  x = batchNormEval(x, { weight: W["net.5.weight"], bias: W["net.5.bias"], running_mean: W["net.5.running_mean"], running_var: W["net.5.running_var"] });
  x = relu(x);

  x = linear(x, W["net.8.weight"], W["net.8.bias"]);
  x = batchNormEval(x, { weight: W["net.9.weight"], bias: W["net.9.bias"], running_mean: W["net.9.running_mean"], running_var: W["net.9.running_var"] });
  x = relu(x);

  const logit = linear(x, W["net.11.weight"], W["net.11.bias"])[0];
  return sigmoid(logit);
}

function survivalRiskExplain(ageYears, sexFemale, episodeNumber) {
  const base = survivalRiskForward(ageYears, sexFemale, episodeNumber);
  const refAge = 55, refEpisode = 1;
  const ageEffect = survivalRiskForward(refAge, sexFemale, episodeNumber) - base;
  const episodeEffect = survivalRiskForward(ageYears, sexFemale, refEpisode) - base;
  const sexEffect = survivalRiskForward(ageYears, sexFemale === 1 ? 0 : 1, episodeNumber) - base;
  return {
    probability: base,
    factors: [
      { key: "age", magnitude: Math.abs(ageEffect), direction: ageEffect < 0 ? "up" : "down" },
      { key: "episode", magnitude: Math.abs(episodeEffect), direction: episodeEffect < 0 ? "up" : "down" },
      { key: "sex", magnitude: Math.abs(sexEffect), direction: sexEffect < 0 ? "up" : "down" },
    ].sort((a, b) => b.magnitude - a.magnitude),
  };
}
