precision highp float;

attribute float addTileScale;
attribute vec2 addTileOffset;
attribute vec2 addTileMorph;


uniform sampler2D heightmap;
//uniform float scale;
//uniform vec2 offset;
uniform vec2 midPos;
uniform vec2 terrainDims;
uniform float tileRes;
//uniform vec2 morph;
// uniform float morphFactor;

		// chunk(shadowmap_pars_vertex);

varying vec3 pos;
varying vec2 uVu;





// Solve cubic equation for roots
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

// Signed distance to quadratic bezier with parametrization.
// Tom'2017
// returns vec4( 
//  unsigned distance to clamped curve,
//  signed distance to extended curve,
//  extended t )
vec3 sdBezier(vec2 A, vec2 B, vec2 C, vec2 p)
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


float lerp(float a, float b, float t)
	{
		return a + t * (b - a);
	}

vec2 catmullRom(float x, vec2 pm1, vec2 p0, vec2 p1, vec2 p2) {
            float x2 = x * x;
            return 0.5 * (
              pm1 * x * ((2.0 - x) * x - 1.0) +
              p0 * (x2 * (3.0 * x - 5.0) + 2.0) +
              p1 * x * ((4.0 - 3.0 * x) * x + 1.0) +
              p2 * (x - 1.0) * x2);
          }		

          float catmullRom(float pm1, float p0, float p1, float p2, float x) {
            float x2 = x * x;
            return 0.5 * (
              pm1 * x * ((2.0 - x) * x - 1.0) +
              p0 * (x2 * (3.0 * x - 5.0) + 2.0) +
              p1 * x * ((4.0 - 3.0 * x) * x + 1.0) +
              p2 * (x - 1.0) * x2);
          }
          // Cubic sampling in one dimension.
          float textureCubicU(sampler2D samp, vec2 uv00, float texel, float offsetV, float frac) {
			//return lerp(	
			//			texture2D(samp, uv00 + vec2(-texel, offsetV)).r*256.,
			//			texture2D(samp, uv00 + vec2(0.0, offsetV)).r*256.,
			//			frac);
            return catmullRom(
                texture2D(samp, uv00 + vec2(-texel * 2.0, offsetV)).r,
                texture2D(samp, uv00 + vec2(-texel, offsetV)).r,
                texture2D(samp, uv00 + vec2(0.0, offsetV)).r,
                texture2D(samp, uv00 + vec2(texel, offsetV)).r,
                frac);
          }
          // Cubic sampling in two dimensions, taking advantage of separability.
          float textureBicubic(sampler2D samp, vec2 uv00, vec2 texel, vec2 frac) {
			//return lerp(	
			//			textureCubicU(samp, uv00, texel.x, -texel.y, frac.x),
			//			textureCubicU(samp, uv00, texel.x, 0.0, frac.x),
			//			frac.y);
            return catmullRom(
                textureCubicU(samp, uv00, texel.x, -texel.y * 2.0, frac.x),
                textureCubicU(samp, uv00, texel.x, -texel.y, frac.x),
                textureCubicU(samp, uv00, texel.x, 0.0, frac.x),
                textureCubicU(samp, uv00, texel.x, texel.y, frac.x),
                frac.y);
          }





/*
vec4 SampleTextureBilinearlyAndUnpack(sampler2D tex, vec2 uv)
{
    vec4 sample_color = texture2D(tex, uv);
//#ifdef PACK_SIGNED_TO_UNSIGNED
    //sample_color = 2.0 * sample_color - 1.0;
//#endif // PACK_SIGNED_TO_UNSIGNED
    return sample_color;
}
vec4 SampleTextureCatmullRom4Samples(sampler2D tex, vec2 uv, vec2 texSize)
{
    // Based on the standard Catmull-Rom spline: w1*C1+w2*C2+w3*C3+w4*C4, where
    // w1 = ((-0.5*f + 1.0)*f - 0.5)*f, w2 = (1.5*f - 2.5)*f*f + 1.0,
    // w3 = ((-1.5*f + 2.0)*f + 0.5)*f and w4 = (0.5*f - 0.5)*f*f with f as the
    // normalized interpolation position between C2 (at f=0) and C3 (at f=1).
 
    // half_f is a sort of sub-pixelquad fraction, -1 <= half_f < 1.
    vec2 half_f     = 2.0 * fract(0.5 * uv * texSize - 0.25) - 1.0;
    
    // f is the regular sub-pixel fraction, 0 <= f < 1. This is equivalent to
    // fract(uv * texSize - 0.5), but based on half_f to prevent rounding issues.
    vec2 f          = fract(half_f);
 
    vec2 s1         = ( 0.5 * f - 0.5) * f;            // = w1 / (1 - f)
    vec2 s12        = (-2.0 * f + 1.5) * f + 1.0;      // = (w2 - w1) / (1 - f)
    vec2 s34        = ( 2.0 * f - 2.5) * f - 0.5;      // = (w4 - w3) / f
 
    // positions is equivalent to: (floor(uv * texSize - 0.5).xyxy + 0.5 +
    // vec4(-1.0 + w2 / (w2 - w1), 1.0 + w4 / (w4 - w3))) / texSize.xyxy.
    vec4 positions  = vec4((-f * s12 + s1      ) / (texSize * s12) + uv,
                           (-f * s34 + s1 + s34) / (texSize * s34) + uv);
 
    // Determine if the output needs to be sign-flipped. Equivalent to .x*.y of
    // (1.0 - 2.0 * floor(t - 2.0 * floor(0.5 * t))), where t is uv * texSize - 0.5.
    float sign_flip = half_f.x * half_f.y > 0.0 ? 1.0 : -1.0;
 
    vec4 w          = vec4(-f * s12 + s12, s34 * f); // = (w2 - w1, w4 - w3)
    vec4 weights    = vec4(w.xz * (w.y * sign_flip), w.xz * (w.w * sign_flip));
 
    return SampleTextureBilinearlyAndUnpack(tex, positions.xy) * weights.x +
           SampleTextureBilinearlyAndUnpack(tex, positions.zy) * weights.y +
           SampleTextureBilinearlyAndUnpack(tex, positions.xw) * weights.z +
           SampleTextureBilinearlyAndUnpack(tex, positions.zw) * weights.w;
}
*/

uniform vec4 segments[18];
uniform vec4 segmentsC[18];
varying vec3 mask1;
float clamp01(float f)
{
	return max(min(f, 0.9999), 0.0001);
}
float dot2( in vec2 v ) { return dot(v,v); }
vec3 sdSqSegment( in vec2 p, in vec4 ab )
{
	//p.xy=p.yx;//change coords!!
	//ab/=1024.;
	//ab.xz=1.-ab.xz;
	//ab.yw=1.-ab.yw;
	//ab=1.-ab;
	//vec2 pa = p - ab.xy, ba = ab.zw - ab.xy;
	vec2 pa = p - ab.xy;
	//if(pa.x>0.1)return 1.;
	vec2 ba = ab.zw - ab.xy;
	return vec3( ba, dot2(pa - ba*clamp01( dot(pa,ba)/dot(ba,ba))) );
}

float ndot( in vec2 a, in vec2 b ) { return a.x*b.x - a.y*b.y; }
float lp2(vec2 p, vec2 a, vec2 b)
{
    vec2 pa = p-a;
    vec2 ba = b-a;
    return clamp(dot(pa,ba)/dot(ba,ba),0.00001,0.99999);
}

vec3 inverseTransformDirection( in vec3 dir, in mat4 matrix ) {return normalize( ( vec4( dir, 0.0 ) * matrix ).xyz );}
flat out int  fixId1;

void main() {
    vec3 objectNormal = vec3( normal );
    vec3 transformedNormal = objectNormal;
    
    pos = position*addTileScale;
    pos.xy += midPos + addTileOffset;

    float gridSpacing = addTileScale/tileRes;
    pos = floor(pos/gridSpacing)*gridSpacing;

    vec2 pShifted = position.xy - vec2(0.5, 0.5);
    vec2 pMorphed = pShifted*addTileMorph*2.0;

    float xMorph = step(0.0, pMorphed.x)*pMorphed.x;
    float yMorph = step(0.0, pMorphed.y)*pMorphed.y;

    gridSpacing = 2.0*gridSpacing;
    vec3 posNext = floor(pos/gridSpacing)*gridSpacing;
    pos = mix(pos, posNext, max(xMorph, yMorph));

    uVu = (pos.xy/terrainDims + 1.0)*0.5;

    fixId1=0;
    if(addTileScale<=256.) {
        vec4 skip1=vec4(0.0001);
        vec3 tmp1=vec3(0.,0.,1.);
        float len1=0.1;
        
        for(int i=0;i<18;i++) {
            if(all(greaterThan(segments[i], skip1))) {
                vec3 tmp1_1=sdBezier(segments[i].xy,segmentsC[i].xy,segments[i].zw,uVu);
                
                if(addTileScale<=128.&&addTileScale>16.&&tmp1.z>tmp1_1.z-0.00001&&tmp1.z<tmp1_1.z+0.00001)fixId1=1;
				else
                if(addTileScale<=16.&&tmp1.z>tmp1_1.z-0.000005&&tmp1.z<tmp1_1.z+0.000005)fixId1=1;
                if(tmp1.z>tmp1_1.z) {
                    len1=segmentsC[i].z;
                    tmp1=tmp1_1;
                }
            }
        }

        mask1.xy=tmp1.xy;
        mask1.z=clamp(pow(1./tmp1.z/80000.,8.),0.,1.);
        mask1.y=(mask1.y*len1);
    }

    vec2 tHeightSize = vec2(128.0,128.0);
    vec2 heightUv00 = (floor(uVu * tHeightSize - 0.5) + 0.5) / tHeightSize;
    vec2 frac = (uVu - heightUv00) * tHeightSize;
    vec2 texel = 1.0 / tHeightSize;
    
    pos.z = textureBicubic(heightmap, heightUv00, texel, frac)*127.5+0.1;

    vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
    // chunk(shadowmap_vertex);

    gl_Position = projectionMatrix *
                modelViewMatrix *
                vec4(pos, 1.0);
                
    mask1.z=min(mask1.z,clamp01((1.-gl_Position.z/gl_Position.w)*100.));
}
