import { defaultPieces } from 'react-chessboard'

const STAUNTON_GROUP_STYLE = {
  opacity: '1',
  fill: 'none',
  fillOpacity: '1',
  fillRule: 'evenodd',
  stroke: '#000000',
  strokeWidth: '1.5',
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  strokeMiterlimit: '4',
}

// ---------------------------------------------------------------------------
// White Red-eared Fox (rf):
// Sculpted Staunton masterpiece with fluid organic curves, alert pointed ears,
// silky cheek ruffs, delicate almond eyes with white glints, flowing whiskers,
// and brilliant ruby-crimson inner-ear inlays.
// ---------------------------------------------------------------------------
export function WhiteRedEaredFox({ svgStyle }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={svgStyle}
    >
      <g style={STAUNTON_GROUP_STYLE}>
        {/* Classical Staunton Pedestal Base */}
        <path
          d="M 9,39 L 36,39 C 36,37.8 35,36.8 34,36.5 L 11,36.5 C 10,36.8 9,37.8 9,39 Z"
          style={{ fill: '#ffffff', stroke: '#000000' }}
        />
        <path
          d="M 11.5,36.5 C 11.5,34.2 15,33 22.5,33 C 30,33 33.5,34.2 33.5,36.5 Z"
          style={{ fill: '#ffffff', stroke: '#000000' }}
        />

        {/* Chest & Collar Ruffle flowing into base */}
        <path
          d="M 14,33 C 14.5,30 18,28.5 22.5,28.5 C 27,28.5 30.5,30 31,33"
          style={{ fill: '#ffffff', stroke: '#000000' }}
        />

        {/* Sculpted Fox Silhouette: Curving alert ears and silky flowing cheek ruffs */}
        <path
          d="M 19,13 
             C 17,9.5 14.5,6.5 12.5,4 
             C 11.8,4 11.2,4.8 11,5.8 
             C 10.5,9 9,13 8,15.5 
             C 6.5,17.5 5.5,19.5 5.5,21.5 
             C 5.5,22.8 7,23 8,23 
             C 6.2,24.5 5.8,26 6.5,27 
             C 7.5,28 10,28.5 12,28.5 
             C 15,30.2 19,31.5 22.5,31.5 
             C 26,31.5 30,30.2 33,28.5 
             C 35,28.5 37.5,28 38.5,27 
             C 39.2,26 38.8,24.5 37,23 
             C 38,23 39.5,22.8 39.5,21.5 
             C 39.5,19.5 38.5,17.5 37,15.5 
             C 36,13 34.5,9 34,5.8 
             C 33.8,4.8 33.2,4 32.5,4 
             C 30.5,6.5 28,9.5 26,13 
             C 24.5,12 20.5,12 19,13 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Red-Eared Fox: Jewel Crimson Inner Ears */}
        <path
          d="M 13,6 C 11.5,9.5 10,13 10.5,15 C 11.5,15.5 14,15 16,13.5 C 15.5,11 14.5,8.5 13,6 Z"
          style={{ fill: '#d32f2f', stroke: '#b71c1c', strokeWidth: '0.8' }}
        />
        <path
          d="M 32,6 C 30.5,8.5 29.5,11 29,13.5 C 31,15 33.5,15.5 34.5,15 C 35,13 33.5,9.5 32,6 Z"
          style={{ fill: '#d32f2f', stroke: '#b71c1c', strokeWidth: '0.8' }}
        />

        {/* Curved Facial Contour / Snout Bridge */}
        <path
          d="M 16.5,19 C 18.5,22 20.5,24.5 22.5,25.5 C 24.5,24.5 26.5,22 28.5,19"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.2' }}
        />

        {/* Noble Almond Fox Eyes with Life Glint */}
        <path
          d="M 14,19 C 15.5,17.5 18,18 19,19.5 C 18,20.8 15.5,20.5 14,19 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="16.2" cy="19.1" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />

        <path
          d="M 31,19 C 29.5,17.5 27,18 26,19.5 C 27,20.8 29.5,20.5 31,19 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="28.8" cy="19.1" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />

        {/* Delicate Heart-shaped Button Nose & Mouth */}
        <path
          d="M 21.3,25.8 C 21.3,25.3 23.7,25.3 23.7,25.8 C 23.7,26.8 22.5,27.6 22.5,27.6 C 22.5,27.6 21.3,26.8 21.3,25.8 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <path
          d="M 22.5,27.6 L 22.5,28.8 M 21.2,28.8 C 22,29.3 23,29.3 23.8,28.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Flowing Curved Whisker Arcs */}
        <path
          d="M 15,25 C 12,24.5 9,25 7,26 M 15.5,26.8 C 13,27 10.5,28 8.5,29.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />
        <path
          d="M 30,25 C 33,24.5 36,25 38,26 M 29.5,26.8 C 32,27 34.5,28 36.5,29.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Graceful Forehead Blaze */}
        <path
          d="M 22.5,13.5 C 22.2,15.5 22.2,17.5 22.5,19"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.9' }}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Black Red-eared Fox (rf):
// Regal midnight charcoal bust with glowing ruby inner ears, luminous white
// contour lines, radiant almond eyes, and silky whiskers.
// ---------------------------------------------------------------------------
export function BlackRedEaredFox({ svgStyle }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={svgStyle}
    >
      <g style={STAUNTON_GROUP_STYLE}>
        {/* Classical Staunton Pedestal Base */}
        <path
          d="M 9,39 L 36,39 C 36,37.8 35,36.8 34,36.5 L 11,36.5 C 10,36.8 9,37.8 9,39 Z"
          style={{ fill: '#000000', stroke: '#000000' }}
        />
        <path
          d="M 11.5,36.5 C 11.5,34.2 15,33 22.5,33 C 30,33 33.5,34.2 33.5,36.5 Z"
          style={{ fill: '#000000', stroke: '#000000' }}
        />
        {/* Base Bevel Outlines in White */}
        <path
          d="M 9,39 L 36,39 M 11,36.5 L 34,36.5 M 13,33.5 C 16,33 29,33 32,33.5"
          style={{ stroke: '#ffffff', strokeWidth: '1' }}
        />

        {/* Chest & Collar Pedestal */}
        <path
          d="M 14,33 C 14.5,30 18,28.5 22.5,28.5 C 27,28.5 30.5,30 31,33"
          style={{ fill: '#000000', stroke: '#000000' }}
        />
        <path
          d="M 15,32 C 16.5,30 19,29 22.5,29 C 26,29 28.5,30 30,32"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1' }}
        />

        {/* Sculpted Fox Silhouette */}
        <path
          d="M 19,13 
             C 17,9.5 14.5,6.5 12.5,4 
             C 11.8,4 11.2,4.8 11,5.8 
             C 10.5,9 9,13 8,15.5 
             C 6.5,17.5 5.5,19.5 5.5,21.5 
             C 5.5,22.8 7,23 8,23 
             C 6.2,24.5 5.8,26 6.5,27 
             C 7.5,28 10,28.5 12,28.5 
             C 15,30.2 19,31.5 22.5,31.5 
             C 26,31.5 30,30.2 33,28.5 
             C 35,28.5 37.5,28 38.5,27 
             C 39.2,26 38.8,24.5 37,23 
             C 38,23 39.5,22.8 39.5,21.5 
             C 39.5,19.5 38.5,17.5 37,15.5 
             C 36,13 34.5,9 34,5.8 
             C 33.8,4.8 33.2,4 32.5,4 
             C 30.5,6.5 28,9.5 26,13 
             C 24.5,12 20.5,12 19,13 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Outer White Contour for High-Definition Contrast */}
        <path
          d="M 12.5,4 C 11.8,4 11.2,4.8 11,5.8 C 10.5,9 9,13 8,15.5 C 6.5,17.5 5.5,19.5 5.5,21.5 C 5.5,22.8 7,23 8,23 C 6.2,24.5 5.8,26 6.5,27 C 7.5,28 10,28.5 12,28.5 C 15,30.2 19,31.5 22.5,31.5 C 26,31.5 30,30.2 33,28.5 C 35,28.5 37.5,28 38.5,27 C 39.2,26 38.8,24.5 37,23 C 38,23 39.5,22.8 39.5,21.5 C 39.5,19.5 38.5,17.5 37,15.5 C 36,13 34.5,9 34,5.8 C 33.8,4.8 33.2,4 32.5,4"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.2' }}
        />

        {/* Glowing Ruby Crimson Inner Ears with White Edge */}
        <path
          d="M 13,6 C 11.5,9.5 10,13 10.5,15 C 11.5,15.5 14,15 16,13.5 C 15.5,11 14.5,8.5 13,6 Z"
          style={{ fill: '#ef5350', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <path
          d="M 32,6 C 30.5,8.5 29.5,11 29,13.5 C 31,15 33.5,15.5 34.5,15 C 35,13 33.5,9.5 32,6 Z"
          style={{ fill: '#ef5350', stroke: '#ffffff', strokeWidth: '1' }}
        />

        {/* Curved Facial Contour / Snout Bridge */}
        <path
          d="M 16.5,19 C 18.5,22 20.5,24.5 22.5,25.5 C 24.5,24.5 26.5,22 28.5,19"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.2' }}
        />

        {/* Luminous Almond Fox Eyes with Ebony Pupils */}
        <path
          d="M 14,19 C 15.5,17.5 18,18 19,19.5 C 18,20.8 15.5,20.5 14,19 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="16.5" cy="19.2" r="0.7" style={{ fill: '#000000', stroke: 'none' }} />

        <path
          d="M 31,19 C 29.5,17.5 27,18 26,19.5 C 27,20.8 29.5,20.5 31,19 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="28.5" cy="19.2" r="0.7" style={{ fill: '#000000', stroke: 'none' }} />

        {/* Delicate White Button Nose & Mouth */}
        <path
          d="M 21.3,25.8 C 21.3,25.3 23.7,25.3 23.7,25.8 C 23.7,26.8 22.5,27.6 22.5,27.6 C 22.5,27.6 21.3,26.8 21.3,25.8 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <path
          d="M 22.5,27.6 L 22.5,28.8 M 21.2,28.8 C 22,29.3 23,29.3 23.8,28.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Flowing Curved Whisker Arcs */}
        <path
          d="M 15,25 C 12,24.5 9,25 7,26 M 15.5,26.8 C 13,27 10.5,28 8.5,29.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />
        <path
          d="M 30,25 C 33,24.5 36,25 38,26 M 29.5,26.8 C 32,27 34.5,28 36.5,29.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Forehead Blaze */}
        <path
          d="M 22.5,13.5 C 22.2,15.5 22.2,17.5 22.5,19"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.9' }}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// White Normal Fox (f):
// High-Staunton monochrome sculpture adorned with an exquisite half-queen
// filigree tiara and soft inner-ear fluting.
// ---------------------------------------------------------------------------
export function WhiteNormalFox({ svgStyle }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={svgStyle}
    >
      <g style={STAUNTON_GROUP_STYLE}>
        {/* Classical Staunton Pedestal Base */}
        <path
          d="M 9,39 L 36,39 C 36,37.8 35,36.8 34,36.5 L 11,36.5 C 10,36.8 9,37.8 9,39 Z"
          style={{ fill: '#ffffff', stroke: '#000000' }}
        />
        <path
          d="M 11.5,36.5 C 11.5,34.2 15,33 22.5,33 C 30,33 33.5,34.2 33.5,36.5 Z"
          style={{ fill: '#ffffff', stroke: '#000000' }}
        />

        {/* Chest & Collar Ruffle */}
        <path
          d="M 14,33 C 14.5,30 18,28.5 22.5,28.5 C 27,28.5 30.5,30 31,33"
          style={{ fill: '#ffffff', stroke: '#000000' }}
        />

        {/* Sculpted Fox Silhouette */}
        <path
          d="M 19,13 
             C 17,9.5 14.5,6.5 12.5,4 
             C 11.8,4 11.2,4.8 11,5.8 
             C 10.5,9 9,13 8,15.5 
             C 6.5,17.5 5.5,19.5 5.5,21.5 
             C 5.5,22.8 7,23 8,23 
             C 6.2,24.5 5.8,26 6.5,27 
             C 7.5,28 10,28.5 12,28.5 
             C 15,30.2 19,31.5 22.5,31.5 
             C 26,31.5 30,30.2 33,28.5 
             C 35,28.5 37.5,28 38.5,27 
             C 39.2,26 38.8,24.5 37,23 
             C 38,23 39.5,22.8 39.5,21.5 
             C 39.5,19.5 38.5,17.5 37,15.5 
             C 36,13 34.5,9 34,5.8 
             C 33.8,4.8 33.2,4 32.5,4 
             C 30.5,6.5 28,9.5 26,13 
             C 24.5,12 20.5,12 19,13 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Elegant Staunton Inner Ear Fluting */}
        <path
          d="M 13,6 C 11.5,9.5 10,13 10.5,15 C 11.5,15.5 14,15 16,13.5 C 15.5,11 14.5,8.5 13,6 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1' }}
        />
        <path
          d="M 12.8,8.5 C 11.8,11 11,13.2 11.8,14.2"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.7' }}
        />

        <path
          d="M 32,6 C 30.5,8.5 29.5,11 29,13.5 C 31,15 33.5,15.5 34.5,15 C 35,13 33.5,9.5 32,6 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1' }}
        />
        <path
          d="M 32.2,8.5 C 33.2,11 34,13.2 33.2,14.2"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.7' }}
        />

        {/* Royal Half-Queen Tiara Diadem & Jewel */}
        <path
          d="M 19,13.2 C 19.5,11 20.5,9.5 21,9 C 21.5,10.5 22,11.5 22.5,11.5 C 23,11.5 23.5,10.5 24,9 C 24.5,9.5 25.5,11 26,13.2 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1' }}
        />
        <circle cx="22.5" cy="8.2" r="0.9" style={{ fill: '#000000', stroke: 'none' }} />

        {/* Curved Facial Contour / Snout Bridge */}
        <path
          d="M 16.5,19 C 18.5,22 20.5,24.5 22.5,25.5 C 24.5,24.5 26.5,22 28.5,19"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.2' }}
        />

        {/* Noble Almond Fox Eyes with Life Glint */}
        <path
          d="M 14,19 C 15.5,17.5 18,18 19,19.5 C 18,20.8 15.5,20.5 14,19 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="16.2" cy="19.1" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />

        <path
          d="M 31,19 C 29.5,17.5 27,18 26,19.5 C 27,20.8 29.5,20.5 31,19 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="28.8" cy="19.1" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />

        {/* Delicate Heart-shaped Button Nose & Mouth */}
        <path
          d="M 21.3,25.8 C 21.3,25.3 23.7,25.3 23.7,25.8 C 23.7,26.8 22.5,27.6 22.5,27.6 C 22.5,27.6 21.3,26.8 21.3,25.8 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <path
          d="M 22.5,27.6 L 22.5,28.8 M 21.2,28.8 C 22,29.3 23,29.3 23.8,28.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Flowing Whisker Arcs */}
        <path
          d="M 15,25 C 12,24.5 9,25 7,26 M 15.5,26.8 C 13,27 10.5,28 8.5,29.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />
        <path
          d="M 30,25 C 33,24.5 36,25 38,26 M 29.5,26.8 C 32,27 34.5,28 36.5,29.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Forehead Blaze */}
        <path
          d="M 22.5,13.8 C 22.2,15.5 22.2,17.5 22.5,19"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.9' }}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Black Normal Fox (f):
// Matching midnight charcoal sculpture with white tiara, silver fluting, and
// poised vulpine gaze.
// ---------------------------------------------------------------------------
export function BlackNormalFox({ svgStyle }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 45 45"
      width="100%"
      height="100%"
      style={svgStyle}
    >
      <g style={STAUNTON_GROUP_STYLE}>
        {/* Classical Staunton Pedestal Base */}
        <path
          d="M 9,39 L 36,39 C 36,37.8 35,36.8 34,36.5 L 11,36.5 C 10,36.8 9,37.8 9,39 Z"
          style={{ fill: '#000000', stroke: '#000000' }}
        />
        <path
          d="M 11.5,36.5 C 11.5,34.2 15,33 22.5,33 C 30,33 33.5,34.2 33.5,36.5 Z"
          style={{ fill: '#000000', stroke: '#000000' }}
        />
        {/* Base Bevel Outlines */}
        <path
          d="M 9,39 L 36,39 M 11,36.5 L 34,36.5 M 13,33.5 C 16,33 29,33 32,33.5"
          style={{ stroke: '#ffffff', strokeWidth: '1' }}
        />

        {/* Chest & Collar Pedestal */}
        <path
          d="M 14,33 C 14.5,30 18,28.5 22.5,28.5 C 27,28.5 30.5,30 31,33"
          style={{ fill: '#000000', stroke: '#000000' }}
        />
        <path
          d="M 15,32 C 16.5,30 19,29 22.5,29 C 26,29 28.5,30 30,32"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1' }}
        />

        {/* Sculpted Fox Silhouette */}
        <path
          d="M 19,13 
             C 17,9.5 14.5,6.5 12.5,4 
             C 11.8,4 11.2,4.8 11,5.8 
             C 10.5,9 9,13 8,15.5 
             C 6.5,17.5 5.5,19.5 5.5,21.5 
             C 5.5,22.8 7,23 8,23 
             C 6.2,24.5 5.8,26 6.5,27 
             C 7.5,28 10,28.5 12,28.5 
             C 15,30.2 19,31.5 22.5,31.5 
             C 26,31.5 30,30.2 33,28.5 
             C 35,28.5 37.5,28 38.5,27 
             C 39.2,26 38.8,24.5 37,23 
             C 38,23 39.5,22.8 39.5,21.5 
             C 39.5,19.5 38.5,17.5 37,15.5 
             C 36,13 34.5,9 34,5.8 
             C 33.8,4.8 33.2,4 32.5,4 
             C 30.5,6.5 28,9.5 26,13 
             C 24.5,12 20.5,12 19,13 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Outer White Contour */}
        <path
          d="M 12.5,4 C 11.8,4 11.2,4.8 11,5.8 C 10.5,9 9,13 8,15.5 C 6.5,17.5 5.5,19.5 5.5,21.5 C 5.5,22.8 7,23 8,23 C 6.2,24.5 5.8,26 6.5,27 C 7.5,28 10,28.5 12,28.5 C 15,30.2 19,31.5 22.5,31.5 C 26,31.5 30,30.2 33,28.5 C 35,28.5 37.5,28 38.5,27 C 39.2,26 38.8,24.5 37,23 C 38,23 39.5,22.8 39.5,21.5 C 39.5,19.5 38.5,17.5 37,15.5 C 36,13 34.5,9 34,5.8 C 33.8,4.8 33.2,4 32.5,4"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.2' }}
        />

        {/* White Inner Ear Fluting */}
        <path
          d="M 13,6 C 11.5,9.5 10,13 10.5,15 C 11.5,15.5 14,15 16,13.5 C 15.5,11 14.5,8.5 13,6 Z"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <path
          d="M 12.8,8.5 C 11.8,11 11,13.2 11.8,14.2"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.7' }}
        />

        <path
          d="M 32,6 C 30.5,8.5 29.5,11 29,13.5 C 31,15 33.5,15.5 34.5,15 C 35,13 33.5,9.5 32,6 Z"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <path
          d="M 32.2,8.5 C 33.2,11 34,13.2 33.2,14.2"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.7' }}
        />

        {/* Royal Half-Queen Tiara Diadem & Jewel */}
        <path
          d="M 19,13.2 C 19.5,11 20.5,9.5 21,9 C 21.5,10.5 22,11.5 22.5,11.5 C 23,11.5 23.5,10.5 24,9 C 24.5,9.5 25.5,11 26,13.2 Z"
          style={{ fill: '#000000', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <circle cx="22.5" cy="8.2" r="0.9" style={{ fill: '#ffffff', stroke: 'none' }} />

        {/* Curved Facial Contour / Snout Bridge */}
        <path
          d="M 16.5,19 C 18.5,22 20.5,24.5 22.5,25.5 C 24.5,24.5 26.5,22 28.5,19"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.2' }}
        />

        {/* Luminous Almond Fox Eyes with Ebony Pupils */}
        <path
          d="M 14,19 C 15.5,17.5 18,18 19,19.5 C 18,20.8 15.5,20.5 14,19 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="16.5" cy="19.2" r="0.7" style={{ fill: '#000000', stroke: 'none' }} />

        <path
          d="M 31,19 C 29.5,17.5 27,18 26,19.5 C 27,20.8 29.5,20.5 31,19 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="28.5" cy="19.2" r="0.7" style={{ fill: '#000000', stroke: 'none' }} />

        {/* Delicate White Button Nose & Mouth */}
        <path
          d="M 21.3,25.8 C 21.3,25.3 23.7,25.3 23.7,25.8 C 23.7,26.8 22.5,27.6 22.5,27.6 C 22.5,27.6 21.3,26.8 21.3,25.8 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <path
          d="M 22.5,27.6 L 22.5,28.8 M 21.2,28.8 C 22,29.3 23,29.3 23.8,28.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Flowing Whisker Arcs */}
        <path
          d="M 15,25 C 12,24.5 9,25 7,26 M 15.5,26.8 C 13,27 10.5,28 8.5,29.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />
        <path
          d="M 30,25 C 33,24.5 36,25 38,26 M 29.5,26.8 C 32,27 34.5,28 36.5,29.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Forehead Blaze */}
        <path
          d="M 22.5,13.8 C 22.2,15.5 22.2,17.5 22.5,19"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.9' }}
        />
      </g>
    </svg>
  )
}

// Master Piece Renderer mapping piece code (e.g. 'wP', 'wRF', 'bF', etc.) to component
export function PieceIcon({ pieceCode, svgStyle = {} }) {
  if (!pieceCode) return null

  switch (pieceCode) {
    case 'wRF':
      return <WhiteRedEaredFox svgStyle={svgStyle} />
    case 'bRF':
      return <BlackRedEaredFox svgStyle={svgStyle} />
    case 'wF':
      return <WhiteNormalFox svgStyle={svgStyle} />
    case 'bF':
      return <BlackNormalFox svgStyle={svgStyle} />
    default: {
      const StandardComp = defaultPieces[pieceCode]
      if (StandardComp) {
        return <StandardComp svgStyle={svgStyle} />
      }
      return null
    }
  }
}
