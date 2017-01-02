precision mediump float;

varying vec2 vPos;
uniform float uTime;
uniform sampler2D texture;

const float SHARPNESS = 300.0;

const float bw_ratio = 0.5;
const float spiral_speed = 0.75;

const float tau = 6.283185307179586;
// ln(4 * golden ratio)
const float log_four_r = 1.867506186179490;
const float color_bands = 8.0;

#pragma glslify: hsl2rgb = require(glsl-hsl2rgb)

vec2 xy2rt(vec2 xy) {
  return vec2(length(xy), atan(xy.y, xy.x));
}

vec3 spiral(vec2 pos) {
  vec2 rt = xy2rt(pos);
  float l = mod(log(rt.r) / log_four_r - rt.t / tau - uTime * spiral_speed, 1.0);
  float h = floor(l * color_bands) / color_bands;
  return hsl2rgb(h, 0.9, 0.6 + 0.25 * sin(uTime * spiral_speed + rt.r) * sin(uTime * spiral_speed / 2.0 + rt.r));
}

void main() {
  vec4 color = vec4(0.0);
  float dist;
  float inCircle;
  vec2 texPos;
  float texSpin = -uTime * spiral_speed;
  float texSin = sin(texSpin);
  float texCos = cos(texSpin);
  mat2 texMat = mat2(texCos, texSin, -texSin, texCos);

  if (-2.0 < vPos.x && vPos.x < 0.0) {
    dist = distance(vec2(-1.0, 0.0), vPos);
    inCircle = clamp(1.0 - (1.0 - dist) * SHARPNESS, 0.0, 1.0);
    texPos = (vPos + vec2(1.0, 0.0)) * texMat;
    color = mix(color, texture2D(texture, 0.5 * texPos + vec2(0.5, 0.5)), (1.0 - inCircle) * 0.25);
  } else if (0.0 < vPos.x && vPos.x < 2.0) {
    dist = distance(vec2(1.0, 0.0), vPos);
    inCircle = clamp(1.0 - (1.0 - dist) * SHARPNESS, 0.0, 1.0);
    texPos = (vec2(-vPos.x, vPos.y) + vec2(1.0, 0.0)) * texMat;
    color = mix(color, texture2D(texture, 0.5 * texPos + vec2(0.5, 0.5)), (1.0 - inCircle) * 0.25);
  }
  if (-2.0 < vPos.x && vPos.x < 2.0) {
    dist = distance(vec2(0.0, 0.0), vPos);
    inCircle = clamp(1.0 - (2.0 - dist) * SHARPNESS, 0.0, 1.0);
    texPos = 0.5 * vPos * texMat;
    color = mix(color, texture2D(texture, 0.5 * texPos + vec2(0.5, 0.5)), (1.0 - inCircle) * 0.25);
  }

  color = mix(color, vec4(spiral(vPos), 1.0), 0.2);

  gl_FragColor = color;
}
