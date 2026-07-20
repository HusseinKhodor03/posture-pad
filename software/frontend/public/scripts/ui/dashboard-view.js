export function updateDashboardMetrics(data) {
  document.getElementById("postureState").innerText =
    `Posture: ${data.posture_analysis.posture_state}`;

  document.getElementById("balance").innerText =
    `Balance: L ${data.posture_metrics.left_percent}% | R ${data.posture_metrics.right_percent}%`;

  document.getElementById("stability").innerText =
    `Stability: ${data.posture_metrics.stability_score}`;

  document.getElementById("suggestion").innerText =
    `Suggestion: ${data.posture_analysis.posture_suggestion}`;

  document.getElementById("leftTotal").innerText =
    `Total: ${data.left_foot.metrics.total_normalized}`;
  document.getElementById("leftCopX").innerText =
    `CoP X: ${data.left_foot.metrics.cop_x}`;
  document.getElementById("leftCopY").innerText =
    `CoP Y: ${data.left_foot.metrics.cop_y}`;
  document.getElementById("leftForefoot").innerText =
    `Forefoot: ${data.left_foot.metrics.forefoot_pressure}`;
  document.getElementById("leftRearfoot").innerText =
    `Rearfoot: ${data.left_foot.metrics.rearfoot_pressure}`;
  document.getElementById("leftMedial").innerText =
    `Medial: ${data.left_foot.metrics.medial_pressure}`;
  document.getElementById("leftLateral").innerText =
    `Lateral: ${data.left_foot.metrics.lateral_pressure}`;

  document.getElementById("rightTotal").innerText =
    `Total: ${data.right_foot.metrics.total_normalized}`;
  document.getElementById("rightCopX").innerText =
    `CoP X: ${data.right_foot.metrics.cop_x}`;
  document.getElementById("rightCopY").innerText =
    `CoP Y: ${data.right_foot.metrics.cop_y}`;
  document.getElementById("rightForefoot").innerText =
    `Forefoot: ${data.right_foot.metrics.forefoot_pressure}`;
  document.getElementById("rightRearfoot").innerText =
    `Rearfoot: ${data.right_foot.metrics.rearfoot_pressure}`;
  document.getElementById("rightMedial").innerText =
    `Medial: ${data.right_foot.metrics.medial_pressure}`;
  document.getElementById("rightLateral").innerText =
    `Lateral: ${data.right_foot.metrics.lateral_pressure}`;
}
