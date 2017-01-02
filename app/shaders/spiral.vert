precision mediump float;
attribute vec2 position;
varying vec2 vPos;
uniform vec2 uScreenSize;
void main() {
  gl_Position = vec4(position, 0, 1);
  vPos = vec2(position.x * uScreenSize.x / uScreenSize.y, position.y);
}
