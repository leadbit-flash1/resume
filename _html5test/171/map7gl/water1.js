var W1RENDER;
var W1CANVAS;

function W1()
{

	var shadersSource = {
		// To keep code simple the uniforms and attributes are automatically extracted from the source.
		// Please ensure that the variable name and closing semicolon have no space between them	
		simple : {
			vertex : {
				type : "VERTEX_SHADER",
				source : `
					attribute vec2 position;
					attribute vec2 texCoord;
					uniform vec2 resolution;
					varying vec2 texCoordV;
					void main() {
						gl_Position = vec4(((position / resolution) * 2.0 - 1.0) * vec2(1, -1), 0, 1);
						texCoordV = texCoord;
					}`
			},
			fragment : {
				type : "FRAGMENT_SHADER",			
				source : `
					precision highp float;
					uniform sampler2D texture0;
					uniform sampler2D texture1;
					uniform sampler2D texture2;
					uniform float time;
					varying vec2 texCoordV;

				

					void main() {
						
						float mask1=(1.-texture2D(texture1, texCoordV).r);

						vec2 uv = texCoordV;
						vec2 growingUv = uv*vec2(3.,7.) + time*2.;//abs(sin(uv*2. + time*2.));
						vec2 uv2 = texture2D(texture2, growingUv).rr*mask1;
							
						vec3 col1=texture2D(texture0, uv*1.0 - uv2 * 0.025).rgb;//-0.1*growingUv.y;
						//vec3 col2=texture2D(texture0, uv).rgb;

						gl_FragColor = vec4(
						
							col1
							//mix(col2,col1,mask1) 
						
						, 1.0);
						
					}`
			}
		}
	}



	function eachOf(array, callback){ var i = 0; const len = array.length; while (i < len && callback(array[i], i++, len) !== true ); };





	/* From groover JS_GL beta */
	function createProgram(gl, pname) 
	{
		var getLocs = (type, source) => 
		{
			var lines = source.split(type);
			lines.shift();
			lines.forEach(str => locs[type + "s"].push(str.split(";")[0].split(" ").pop().split("[")[0]) );
		}
		var shaders = [];
		var locs = { uniforms : [], attributes : [] };
		[shadersSource[pname].vertex, shadersSource[pname].fragment].forEach(script => {
				var shader = gl.createShader(gl[script.type]);
				gl.shaderSource(shader, script.source);
				gl.compileShader(shader);
				shaders.push(shader);
				getLocs("uniform", script.source);
				getLocs("attribute", script.source);
			});
		var program = gl.createProgram();
		shaders.forEach((shader) => gl.attachShader(program, shader) );
		gl.linkProgram(program);
		program.locations = {};
		locs.uniforms.forEach(uname => program.locations[uname] = gl.getUniformLocation(program, uname));
		locs.attributes.forEach(uname => program.locations[uname] = gl.getAttribLocation(program, uname));
		if (gl.programs === undefined) {  gl.programs = {} } // please don use gl.programs = gl.programs || {}
		gl.programs[pname] = program;
		return program;
	}
	function createTexture(gl, image, settings) 
		{
		settings = Object.assign({  wrap : "CLAMP_TO_EDGE", filter : "LINEAR", textureNum : 1 }, settings);
		var texture = gl.createTexture();
		var tn = settings.textureNum;
		if(tn)
		{
		  gl.activeTexture(gl.TEXTURE0 + tn);
			if(gl.currentProgram.locations["texture" + tn])
			{
				gl.uniform1i(gl.currentProgram.locations["texture" + tn], tn);
			}
		}
		gl.bindTexture(gl.TEXTURE_2D, texture);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, settings.wrap ? gl[settings.wrap] : gl[settings.wrapS]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, settings.wrap ? gl[settings.wrap] : gl[settings.wrapT]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, settings.filter ? gl[settings.filter] : gl[settings.filterMin]);
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, settings.filter ? gl[settings.filter] : gl[settings.filterMag]);
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
		return texture;
	}
	function setVertexBuffer(gl, settings) 
	{
		settings = Object.assign({  type : "FLOAT", size : 2  }, settings);
		var buf = gl.createBuffer();
		gl.bindBuffer(gl.ARRAY_BUFFER, buf);
		gl.bufferData(gl.ARRAY_BUFFER, settings.data, gl.STATIC_DRAW);
		gl.enableVertexAttribArray(gl.currentProgram.locations[settings.name]);
		gl.vertexAttribPointer(gl.currentProgram.locations[settings.name], settings.size, gl[settings.type], false, 0, 0);
	}
	/* end groover JS_GL beta */

	//========================================================================================================
	
	var w=760, h=793, ctx, globalTime = 0;  
	var webGL;





	var canvas=document.createElement("canvas");
	canvas.width=w;
	canvas.height=h; 
	var ctx=canvas.getContext('2d');

					var img1 = new Image();
					img1.src = 'map7gl/w1.jpg';
					
					var img2 = new Image();
					img2.src = 'map7gl/w2.jpg';
					
					var noise1=new Image();
					noise1.src='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAFdZJREFUeF6F28fKbEUXxvG9zTnnnCOCV+ElCOrEoQ5E0JEKesyggogoOHDiRHDkrYg555xztuW38H/YHD74Gprud3fVCs8KtWpVveuePXt2P/744/LDDz8sBxxwwHLyyScvp59++nL44Ycv33333fLFF18s67rO3/vtt9+Me/vtt5cvv/xyOe6445aLLrpoOf/885ejjz56+frrr5f3339/+fvvv5ejjjpqOfDAA4fGt99+uxx88MHLkUceOb/99NNPw+vQQw9ddrvd8v333y9//vnncsghhyxHHHHE8vvvvy9kwvf4448feQ477LChhS8+P//888w/8cQTR7Z//vln+e2334beH3/8MTx8N/+UU04Z2viQxe9+I8P66KOP7jD/5ZdfFi9CEuKvv/4aZiZ4dtppp80nwgD49NNPR6lTTz11Offcc+d3cz7//PMRznc0AUgZc0866aRl//33H2GPOeaYeXsZ422e3/Awh4DmnHfeeQMCQH/99dcZ59Pf6FLoo48+Wj788MO9IADDC48zzjhj6Bx00EFjAG/y+VwffPDBHYUR8xAxgrO07wSm3Nlnnz0oQh8zwHghyhMwQYfgX3311V7LAxEt1iIEaxl35plnjvUIYUxgG/vZZ58NDfwozsPw51VAIZNXygD9xRdfXN55553RgUw+vRnphBNOGF68gaeaT0dArrfffvsOEz96yLIffPDBKICh31iApaHKxSmfC7EEq2Fy7LHHjmUog1au+M033+y1OgGMBRgwCMHilOH6aL/11lsDAv54M0AhRSGyAhQPtMlkDvCA600mspCTwt5oCIf4ColVDjjnnHNGKEoj9Nprr42loSbGL7jggmGK2ZtvvjmMMUGo/CFGuSOm6LBCggCEcsYDybtY5/pC0FzKEQp/HkCmSy65ZNwYmHhRhDGM9zeDffLJJzPPM8AC2WsbiqPsug4A0QPY+vjjjw8AJnElzCnJEgQ966yzhij0CAUghDEDCqQJBwBKIwoAypjPZYtX4zH3mzkEZz2/mw8gYIhlXiFkGABYFACkF8Ogy0hkLl+QUz6iS8m2eDfGS7iSnTdPCDz55JO7sjiBXnnllYlxAhLYBIJhmLsBQs7gmhGMKSG5r/m5Y9ma4BRl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'
					
					var tmp1count=0;
					img1.onload = img2.onload = noise1.onload = function () 
					{
						tmp1count++;
						if(tmp1count==3)
						startWebGL([{image : img1},{image : img2},{image : noise1, wrap:"REPEAT"}]);
					};
					
					
					
					




	
	var W1IMAGES=null;

	function onContextLost(e)
	{
		console.log(e);
		e.preventDefault();
	}

	function onContextRestore(e)
	{
		webGL.gl = webGL.getContext("webgl");
		var gl = webGL.gl;
		var program = createProgram(gl, "simple");
		gl.useProgram(program);
		gl.currentProgram = program;
		setVertexBuffer(gl, {name : "texCoord", data : new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]) });
		setVertexBuffer(gl, {name : "position", data : new Float32Array([0, 0, w, 0, 0, h, 0, h, w, 0, w, h]) });
		eachOf(W1IMAGES,(imageDesc,i)=>createTexture(gl, imageDesc.image, Object.assign({textureNum : i},imageDesc)));
		gl.uniform2f(program.locations.resolution, w, h);
	}

	function startWebGL(images) {
		W1IMAGES=images;
		webGL = document.createElement("canvas");
		webGL.width = w;
		webGL.height = h;
		webGL.addEventListener("webglcontextlost", onContextLost, false);
		webGL.addEventListener("webglcontextrestored", onContextRestore, false);
		onContextRestore(null);
	}

	function webGLRender()
	{
		
		if (webGL !== undefined) 
		{  
			globalTime++;
			globalTime%=1000000;

			var gl = webGL.gl;


			var loc = gl.currentProgram.locations;

		  
			gl.uniform1f(loc.time, globalTime / 1000);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			

			ctx.drawImage(webGL, 0, 0, canvas.width, canvas.height);
			//ctx.drawImage(img2, 0, -4395*0);
		}
						
						
	}
	W1RENDER=webGLRender;
	W1CANVAS=canvas;
}
W1();

