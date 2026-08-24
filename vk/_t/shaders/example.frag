precision highp float;
precision mediump sampler2D;


//uniform sampler2D heightmap;
//uniform sampler2D normalmap;
//uniform sampler2D tex1;
uniform sampler2D tAlphaMap, tSplat1, tSplat2, tSplat3, tSplat4, tTangent1, tTangent2;//, lightMap1;
//uniform float scale;

		// chunk(common);
		// chunk(lights_pars_begin);
		// chunk(packing);
		// chunk(shadowmap_pars_fragment);
		// chunk(shadowmask_pars_fragment);

varying vec3 pos;
varying vec2 uVu;
varying vec3 mask1;
flat in int fixId1;

/////////////////////////////////////////

/*
float DecodeFloatRGBA( vec4 rgba ) {
  return dot( rgba.rgb, vec3(1.0, 1./255.0, 1./65025.0));//, 1./16581375.0) );
}

float clamp01(float f)
{
	return max(min(f, 1.0), 0.0);
}
vec3 road(float f)
{
	return f > 0.8 ? vec3(mix(vec3(0.3), vec3(0.8), (f - 0.8) * 5.0)) : vec3(mix(vec3(0.4, 0.5, 0.1), vec3(0.3), clamp01(f * 5.0)));
}
*/

/*
float dot2( in vec2 v ) { return dot(v,v); }
float sdSqSegment( in vec2 p, in vec4 ab )
{
	//p.xy=p.yx;//change coords!!
	//ab/=1024.;
	//ab.xz=1.-ab.xz;
	//ab.yw=1.-ab.yw;
	//ab=1.-ab;
	//vec2 pa = p - ab.xy, ba = ab.zw - ab.xy;
	vec2 pa = p - ab.yx;
	//if(pa.x>0.1)return 1.;
	vec2 ba = ab.wz - ab.yx;
	return dot2( pa - ba*clamp01( dot(pa,ba)/dot(ba,ba)) );
}
*/
/////////////////////////////////////////
vec3 solveCubic(float a, float b, float c)
{
   float p = b - a*a / 3.0, p3 = p*p*p;
   float q = a * (2.0*a*a - 9.0*b) / 27.0 + c;
   float d = q*q + 4.0*p3 / 27.0;
   float offset = -a / 3.0;
   if(d >= 0.0) { 
      float z = sqrt(d);
      vec2 x = (vec2(z, -z) - q) / 2.0;
      vec2 uv = sign(x)*pow(abs(x), vec2(1.0/3.0));
	  
	  
	  
	//if( abs(p3/27.) < q*q*0.001 ) 
	//{
	//return vec3(0.);
	//	if( q <0. )
	//		return vec3(uv.x +  offset + p / ( 3. * -pow(-q,1./3.) ) );
	//	else
	//		return vec3(uv.y +  offset + p / ( 3. * pow(q,1./3.) )	);
	//}
		if(uv.x==0.)
			return vec3(uv.y +  offset + p / ( 3. * pow(q, 1./3.) )	);
		else	  
		if(uv.y==0.)
			return vec3(uv.x +  offset + p / ( 3. * -pow(-q, 1./3.) ) );
		else
			return vec3(offset + uv.x + uv.y);
   }
   float v = acos(-sqrt(-27.0 / p3) * q / 2.0) / 3.0;
   float m = cos(v), n = sin(v)*1.732050808;
   return vec3(m + m, -n - m, n - m) * sqrt(-p / 3.0) + offset;
}


vec3 sdBezier0(vec2 A, vec2 B, vec2 C, vec2 p)
{
   B = mix(B + vec2(1e-4), B, abs(sign(B * 2.0 - A - C)));
   vec2 a = B - A, b = A - B * 2.0 + C, c = a * 2.0, d = A - p;
   vec3 k = vec3(3.*dot(a,b),2.*dot(a,a)+dot(d,b),dot(d,a)) / dot(b,b);

   vec2 t = clamp(solveCubic(k.x, k.y, k.z).xy, 0.0001, 0.9999);
   vec2 dp1 = d + (c + b*t.x)*t.x;
   float d1 = dot(dp1, dp1);
   vec2 dp2 = d + (c + b*t.y)*t.y;
   float d2 = dot(dp2, dp2);

   // note: 3rd root is actually never closest, we can just ignore it
     
   vec4 r = (d1 < d2) ? vec4(d1, t.x, dp1) : vec4(d2, t.y, dp2);
   
   // Sign is just cross product with gradient
   vec2 g = 2.*b*r.y + c;
   float s =  sign(g.x*r.w - g.y*r.z);
   
   float dist = sqrt(r.x);
   return vec3(s*dist, r.y, dist*dist);

}

float cro(vec2 a, vec2 b) { return a.x*b.y - a.y*b.x; }
float dot2(vec2 v) { return dot(v,v); }

vec3 sdBezier(vec2 A, vec2 B, vec2 C, vec2 p)
{
    vec2 i = A - C;
    vec2 j = C - B;
    vec2 k = B - A;
    vec2 w = j-k;

    vec2 v0 = A-p; 
    vec2 v1 = B-p; 
    vec2 v2 = C-p;
    
    float x = cro(v0, v2);
    float y = cro(v1, v0);
    float z = cro(v2, v1);

    vec2 s = 2.0*(y*j+z*k)-x*i;

    float r = (y*z-x*x*0.25)/dot2(s);
    float t = clamp((0.5*x+y+r*dot(s,w))/(x+y+z),0.0,1.0);
    
    vec2 d = v0+t*(k+k+t*w);
    
    float dist = length(d);
    vec2 g = 2.0*(k+t*w);
    float s_sign = sign(g.x*d.y - g.y*d.x);
    
    return vec3(s_sign*dist, t, dist*dist);
}
/////////////////////////////////////////

uniform vec4 segments[18];
uniform vec4 segmentsC[18];



vec2 pingpong(vec2 x) { return abs(fract(x) - 0.5); }

void main() {
    float a1 = 2.0 - gl_FragCoord.z / gl_FragCoord.w / 1000.0;

    vec4 splat1 = texture2D(tSplat1, uVu * 100.0);
    vec4 splat2 = texture2D(tSplat2, uVu * 100.0);
    vec4 splat3 = texture2D(tSplat3, uVu * 100.0);
    vec4 splat4 = texture2D(tSplat4, pingpong(mask1.xy*320.-0.5), -1.5);

    vec4 alphaMap = texture2D(tAlphaMap, uVu, 2.0);

    if (fixId1 == 1 && mask1.z > 0.5) {
		vec4 skip1=vec4(0.0001);
        vec3 tmp1=vec3(0.,0.,1.);
        float len1=0.1;

        for (int i = 0; i < 18; i++) {
            if(all(greaterThan(segments[i], skip1))) {
                vec3 tmp1_1 = sdBezier(segments[i].xy, segmentsC[i].xy, segments[i].zw, uVu);
                if (tmp1.z > tmp1_1.z) {
                    tmp1 = tmp1_1;
                    len1=segmentsC[i].z;
                }
            }
        }
		tmp1.y=tmp1.y*len1;
        splat4 = texture2D(tSplat4, pingpong(tmp1.xy*320.-0.5), -1.5);
    }

    vec4 c1 = mix(
        splat1 * alphaMap.r + splat2 * alphaMap.g + splat3 * alphaMap.b,
        splat4,
        mask1.z
    );

    // Assuming getShadowMask() is defined elsewhere
    gl_FragColor = c1 * (0.7 + getShadowMask() * 0.7);
    gl_FragColor.a = a1;
}