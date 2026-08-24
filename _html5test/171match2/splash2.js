var S1RENDER;
var S1CANVAS;

function S1()
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
					uniform highp vec2 resolution;
					varying vec2 texCoordV;
					varying float aspect1;

					void main() {
						aspect1=resolution.y/resolution.x;

						gl_Position = vec4(((position / resolution) * 2.0 - 1.0) * vec2(1, -1), 0, 1);
						texCoordV = texCoord;
					}`
			},
			fragment : {
				type : "FRAGMENT_SHADER",			
				source : `
						/////////////////////////
						precision highp float;
						varying vec2 texCoordV;
						varying float aspect1;
						uniform float time;

						
						uniform sampler2D texture0;
						uniform sampler2D texture1;
						
						
						
vec4 mainImage (vec2 fragCoord )
{   

	vec4 fragColor=texture2D(texture1,fragCoord*vec2(1.,1.));
	fragColor.rgb+=max(1.-abs(-1.-(texCoordV.x+texCoordV.y*0.5+(fragColor.r*fragColor.g*fragColor.b)*0.5)*4.+mod(time*10.,8.)),0.)*fragColor.a*0.5*fragColor.g;
	return fragColor;
	//return fragColor;
}

						

						
						void main()
						{
							
							//gl_FragColor = vec4(1.0,1.0,1.0,1.0);
							gl_FragColor = mainImage(texCoordV);
							
						}


						
					////////
					`
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
	// Demo code starts here
	// globals w = width, h = height, t = top,  l = left, cw = center width, ch = center height, ctx = context
	var _w, _h, ctx, globalTime = 0;  
	var webGL;





	var canvas=document.createElement("canvas");
	canvas.width=0;
	canvas.height=0; 
	var ctx=canvas.getContext('2d');

					/*
					var img1 = new Image();
					img1.src = 's1.png';
					img1.onload = function () 
					{
						var bg1 = document.createElement("canvas");

						bg1.width=img1.width;
						bg1.height=img1.height; 
						bg1.getContext('2d').drawImage(img1, 0, -2850*0);
						

						startWebGL([{image : bg1, wrap:"REPEAT"}]);
					};
					*/
					//startWebGL([]);

					
					
					var loaded1=0;
					
					var img1 = new Image();
					img1.src = 's0.jpg';
					//img1.crossOrigin = "anonymous";
					loaded1++;
					
					var img2 = new Image();
					img2.src = 's1.png';
					loaded1++;
					
					var img3 = new Image();
					img3.src = 's2.png';
					loaded1++;
					
					img1.onload = img2.onload = img3.onload = function (){loaded1--;}
					




	
	var IMAGES=null;

	function onContextLost(e)
	{
		console.log(e);
		e.preventDefault();
	}

	function onContextRestore(e)
	{
		webGL.gl = webGL.getContext("webgl");
		var gl = webGL.gl;
		console.log(gl);
		var program = createProgram(gl, "simple");
		gl.useProgram(program);
		gl.currentProgram = program;
		setVertexBuffer(gl, {name : "texCoord", data : new Float32Array([0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 1.0]) });
		setVertexBuffer(gl, {name : "position", data : new Float32Array([0, 0, _w, 0, 0, _h, 0, _h, _w, 0, _w, _h]) });
		if(IMAGES!=null)eachOf(IMAGES,(imageDesc,i)=>createTexture(gl, imageDesc.image, Object.assign({textureNum : i},imageDesc)));
		gl.uniform2f(program.locations.resolution, _w, _h);
		gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
		createTexture(gl, generateNoise(), {textureNum:0,wrap:"REPEAT"});
		

	}

	function startWebGL(images) {
		IMAGES=images;
		webGL = document.createElement("canvas");
		webGL.width = 512;
		webGL.height = 512;
		webGL.addEventListener("webglcontextlost", onContextLost, false);
		webGL.addEventListener("webglcontextrestored", onContextRestore, false);
		onContextRestore(null);
	}
	
	function random1(seed) {
		//return Math.random();
		var x = Math.sin(seed) * 10000;
		return x - Math.floor(x);
	}
	
	function generateNoise() {
	
		var canvas = document.createElement("canvas"),
		ctx = canvas.getContext('2d'),
		x, y,
		number1,number2,number3,number4;

		canvas.width = 256;
		canvas.height = 256;
		ctx.imageSmoothingEnabled =false;
		
		var i=0;
		for ( x = 0; x < canvas.width; x++ ) {
		  for ( y = 0; y < canvas.height; y++ ) {
			 number1 = Math.floor( random1(i++) * 256 );
			 number2 = Math.floor( random1(i++) * 256 );
			 number3 = Math.floor( random1(i++) * 256 );
			 number4 = Math.floor( random1(i++) * 256 );

			 ctx.fillStyle = "rgba(" + number1 + "," + number2 + "," + number3 + "," + number4 + ")";
			 ctx.fillRect(x, y, 1, 1);
		  }
		}

		return canvas;
	}


	var init1=null;
	function webGLRender(ctx1,w1,h1)
	{
		
		if (webGL !== undefined)
		{
		}
		else
		{
			if(ctx1!=null)
			{
				ctx=ctx1;
				canvas=ctx1.canvas;
				_w=canvas.width;
				_h=canvas.height;
				startWebGL([]);
			}
			else
			if(init1==null)
			{
				init1=1;
				//canvas=document.createElement("canvas");
				//canvas.width=window.innerWidth;
				//canvas.height=window.innerHeight; 
				//ctx=canvas.getContext('2d');
				//w=canvas.width;
				//h=canvas.height;
				canvas.width=w1;
				canvas.height=h1;
				_w=w1;
				_h=h1;
				startWebGL([]);
			}
			
		}
		
		if(loaded1!=0)return;
		
		
		
		if (webGL !== undefined) 
		{  
			var gl = webGL.gl;
			if(img2.tex1==null)img2.tex1=createTexture(gl, img2, {textureNum:1,wrap:"REPEAT"});
			
			
			globalTime+=30;



			var loc = gl.currentProgram.locations;

		  
			gl.uniform1f(loc.time, globalTime / 1000);
			gl.drawArrays(gl.TRIANGLES, 0, 6);
			
			
			var IPAD=(canvas.width/canvas.height)>0.69;
			
			
			var tmpx=Math.cos(globalTime*0.005)*10;
			var tmpy=Math.sin(globalTime*0.005)*10;
			
			var tmp1=-canvas.width/(IPAD?8:8);///8;//*Math.sin(globalTime/1000);
			let off0=Math.max(0,canvas.height-canvas.width)/2;ctx.drawImage(img1, -off0-tmpx-10, 0, canvas.width+off0*2+tmpx*2+20, canvas.height);
			//ctx.drawImage(webGL, 0, 0, canvas.width, canvas.height);
			
			//ctx.drawImage(img4, 0, 0, canvas.width, canvas.height);
			//var tmph=img4.height/(canvas.width/canvas.height);
			var tmph=canvas.width/(img3.width/img3.height);
			ctx.drawImage(img3, 0, canvas.height-tmph+(IPAD?canvas.height*0.05:0)-(tmpy-10)*0.25, canvas.width, tmph+(tmpy+20)*0.25);

			//ctx.drawImage(img2, -tmp1+tmpx, Math.floor(canvas.height/3)+tmpy-(canvas.width+tmp1*2)*0.5,canvas.width+tmp1*2, canvas.width+tmp1*2+tmpx*2);
			ctx.drawImage(webGL, -tmp1+tmpx-tmp1*1.5, Math.floor(canvas.height-canvas.height/3)+tmpy-(canvas.width+tmp1*2)*0.5-0*(IPAD?canvas.height*0.07:0),canvas.width+tmp1*2, canvas.width+tmp1*2+tmpx*2);

			
			//var anim1=Math.abs(Math.cos(globalTime*0.01)*10);
			//var anim2=Math.sin(globalTime*0.01)*5;
			//var logoW=canvas.width/3;
			//ctx.drawImage(img3, canvas.width-logoW*2+anim2, canvas.height - logoW/3 - Math.floor(canvas.height/32)-anim1-anim2,logoW-anim2, logoW/3+anim2);
		}
						
						
	}
	S1RENDER=webGLRender;
	S1CANVAS=canvas;
}
S1();

