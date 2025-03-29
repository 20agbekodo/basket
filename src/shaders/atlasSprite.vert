uniform float uSize;

attribute vec4 atlasUv;
attribute float visibility;
attribute vec3 salaryColor;

varying vec2 vUv;
varying vec2 vLocalUv;
varying float vVisibility;
varying vec3 vSalaryColor;

void main() {
  vVisibility = visibility;
  vSalaryColor = salaryColor;
  vLocalUv = uv;

  // Remap local UV [0,1]^2 into the atlas sub-region
  vUv = vec2(atlasUv.x + uv.x * atlasUv.z, atlasUv.y + uv.y * atlasUv.w);

  // Billboard: extract camera right/up vectors from the view matrix columns
  // so the quad always faces the camera regardless of instance rotation.
  vec3 cameraRight = vec3(modelViewMatrix[0][0], modelViewMatrix[1][0], modelViewMatrix[2][0]);
  vec3 cameraUp    = vec3(modelViewMatrix[0][1], modelViewMatrix[1][1], modelViewMatrix[2][1]);

  // Instance world position from the 4th column of the instance matrix
  vec3 instancePos = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);

  // Offset in world space using local quad position (PlaneGeometry verts are [-0.5, 0.5])
  vec3 worldPos = instancePos
    + cameraRight * position.x * uSize
    + cameraUp    * position.y * uSize;

  gl_Position = projectionMatrix * viewMatrix * vec4(worldPos, 1.0);
}
