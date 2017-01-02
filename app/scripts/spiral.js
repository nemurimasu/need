const triangle      = require('a-big-triangle'),
      createContext = require('webgl-context'),
      createShader  = require('gl-shader'),
      createTexture = require('gl-texture2d'),
      glslify       = require('glslify'),
      autoscale     = require('canvas-autoscale'),
      rafLoop       = require('raf-loop');

const validSizes = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024, 2048, 4096];

module.exports = function(canvas, image) {
  const gl = createContext({canvas});
  const shader = createShader(gl, glslify('../shaders/spiral.vert'), glslify('../shaders/spiral.frag'));

  const texture = createTexture(gl, image);
  texture.bind();
  if (validSizes.includes(image.width) && validSizes.includes(image.height)) {
    texture.generateMipmap();
    texture.minFilter = gl.LINEAR_MIPMAP_LINEAR;
    texture.magFilter = gl.LINEAR;
    texture.wrap = gl.CLAMP_TO_EDGE;
  } else {
    texture.minFilter = texture.magFilter = gl.LINEAR;
    texture.wrap = gl.CLAMP_TO_EDGE;
  }

  let resize;
  const startTime = Date.now();
  const render = () => {
    resize.tick();
    gl.viewport(0, 0, canvas.width, canvas.height);
    shader.bind();
    texture.bind(0);
    shader.uniforms.uScreenSize = [gl.drawingBufferWidth, gl.drawingBufferHeight];
    shader.uniforms.uTime = (Date.now() - startTime) / 1000.0;
    triangle(gl);
  };
  resize = autoscale(canvas, {}, render);

  return rafLoop(function(dt) {
    render();
  }).start();
}
