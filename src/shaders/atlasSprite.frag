uniform sampler2D uAtlas;

varying vec2 vUv;
varying vec2 vLocalUv;
varying float vVisibility;
varying vec3 vSalaryColor;

void main() {
  if (vVisibility < 0.5) discard;

  // Circular mask: vLocalUv is in [0,1]; center at (0.5, 0.5), radius 0.5
  vec2 fromCenter = vLocalUv - vec2(0.5, 0.5);
  float dist = length(fromCenter);
  // Soft edge: smoothstep slightly inside the circle boundary
  float alpha = 1.0 - smoothstep(0.45, 0.5, dist);
  if (alpha < 0.01) discard;

  vec4 texColor = texture2D(uAtlas, vUv);

  // Blend salary tint (vSalaryColor = white means no shift)
  texColor.rgb = mix(texColor.rgb, vSalaryColor, 0.3);
  texColor.a *= alpha;

  if (texColor.a < 0.02) discard;

  gl_FragColor = texColor;
}
