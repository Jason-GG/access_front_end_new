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
// Sculpted Staunton fox with authentic vulpine anatomy: tall pointed alert ears,
// flared cheek ruffs, slender tapering V-wedge muzzle, cunning slanted almond eyes,
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

        {/* Sculpted Fox Bust: Tall alert ears, flared cheek ruffs, tapering into base */}
        <path
          d="M 22.5,12.5
             C 20.5,12.0 18.2,11.2 17.2,10.5
             L 10.5,3.0
             C 9.8,3.5 9.0,5.2 8.8,7.0
             C 8.2,10.0 7.6,12.5 7.0,14.0
             C 5.8,15.5 4.5,17.2 4.0,18.8
             C 3.8,19.5 4.2,20.0 5.2,19.8
             C 6.8,19.5 7.8,19.2 8.5,20.2
             C 7.0,21.8 5.2,23.5 5.0,24.5
             C 4.8,25.3 5.5,25.5 6.8,25.2
             C 8.2,24.8 9.5,24.2 10.5,25.5
             C 11.8,27.2 12.8,29.8 13.5,33.0
             L 31.5,33.0
             C 32.2,29.8 33.2,27.2 34.5,25.5
             C 35.5,24.2 36.8,24.8 38.2,25.2
             C 39.5,25.5 40.2,25.3 40.0,24.5
             C 39.8,23.5 38.0,21.8 36.5,20.2
             C 37.2,19.2 38.2,19.5 39.8,19.8
             C 40.8,20.0 41.2,19.5 41.0,18.8
             C 40.5,17.2 39.0,15.5 37.8,14.0
             C 37.2,12.5 36.5,10.0 36.0,7.0
             C 35.8,5.2 35.0,3.5 34.5,3.0
             L 27.8,10.5
             C 26.8,11.2 24.5,12.0 22.5,12.5 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Red-Eared Fox: Ruby Crimson Inner Ears */}
        <path
          d="M 11.0,5.2 C 9.8,8.5 9.0,12.0 9.8,13.8 C 10.8,14.5 13.5,13.8 15.5,11.8 C 14.8,9.5 13.0,7.0 11.0,5.2 Z"
          style={{ fill: '#d32f2f', stroke: '#b71c1c', strokeWidth: '0.9' }}
        />
        <path
          d="M 34.0,5.2 C 35.2,8.5 36.0,12.0 35.2,13.8 C 34.2,14.5 31.5,13.8 29.5,11.8 C 30.2,9.5 32.0,7.0 34.0,5.2 Z"
          style={{ fill: '#d32f2f', stroke: '#b71c1c', strokeWidth: '0.9' }}
        />

        {/* Forehead Vulpine Blaze */}
        <path
          d="M 22.5,12.5 L 22.5,16.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.1' }}
        />

        {/* Cunning Slanted Almond Fox Eyes with Life Glint */}
        <path
          d="M 13.0,17.2 C 14.2,16.0 16.8,16.8 18.2,19.2 C 16.5,19.8 14.5,19.2 13.0,17.2 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="15.8" cy="18.0" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />
        <path
          d="M 13.0,17.2 C 11.5,17.0 10.2,17.5 9.2,18.2"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        <path
          d="M 32.0,17.2 C 30.8,16.0 28.2,16.8 26.8,19.2 C 28.5,19.8 30.5,19.2 32.0,17.2 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="29.2" cy="18.0" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />
        <path
          d="M 32.0,17.2 C 33.5,17.0 34.8,17.5 35.8,18.2"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Long Slender Muzzle Bridge (Tapering from eyes to nose) */}
        <path
          d="M 18.2,19.2 C 19.5,22.0 20.8,24.8 21.0,26.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.1' }}
        />
        <path
          d="M 26.8,19.2 C 25.5,22.0 24.2,24.8 24.0,26.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.1' }}
        />

        {/* Cheek-to-Snout Mask Contours */}
        <path
          d="M 10.5,24.5 C 13.5,23.5 17.0,24.8 19.5,26.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />
        <path
          d="M 34.5,24.5 C 31.5,23.5 28.0,24.8 25.5,26.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Crisp Triangular Fox Nose Pad */}
        <path
          d="M 21.0,26.5 C 21.0,26.0 24.0,26.0 24.0,26.5 C 24.0,27.5 22.8,28.4 22.5,28.4 C 22.2,28.4 21.0,27.5 21.0,26.5 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.5' }}
        />

        {/* Vulpine Mouth & Tapered Chin */}
        <path
          d="M 22.5,28.4 L 22.5,29.3 M 20.8,29.8 C 21.8,30.2 23.2,30.2 24.2,29.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.9' }}
        />
        <path
          d="M 20.0,30.8 C 21.2,31.5 23.8,31.5 25.0,30.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.0' }}
        />

        {/* Flowing Chest Fur Bib */}
        <path
          d="M 16.5,33.0 C 17.5,31.2 19.8,30.5 22.5,30.5 C 25.2,30.5 27.5,31.2 28.5,33.0"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.9' }}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Black Red-eared Fox (rf):
// Regal midnight charcoal bust with glowing ruby inner ears, luminous white
// contour lines, radiant almond eyes, and sharp vulpine muzzle.
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

        {/* Sculpted Fox Bust Silhouette */}
        <path
          d="M 22.5,12.5
             C 20.5,12.0 18.2,11.2 17.2,10.5
             L 10.5,3.0
             C 9.8,3.5 9.0,5.2 8.8,7.0
             C 8.2,10.0 7.6,12.5 7.0,14.0
             C 5.8,15.5 4.5,17.2 4.0,18.8
             C 3.8,19.5 4.2,20.0 5.2,19.8
             C 6.8,19.5 7.8,19.2 8.5,20.2
             C 7.0,21.8 5.2,23.5 5.0,24.5
             C 4.8,25.3 5.5,25.5 6.8,25.2
             C 8.2,24.8 9.5,24.2 10.5,25.5
             C 11.8,27.2 12.8,29.8 13.5,33.0
             L 31.5,33.0
             C 32.2,29.8 33.2,27.2 34.5,25.5
             C 35.5,24.2 36.8,24.8 38.2,25.2
             C 39.5,25.5 40.2,25.3 40.0,24.5
             C 39.8,23.5 38.0,21.8 36.5,20.2
             C 37.2,19.2 38.2,19.5 39.8,19.8
             C 40.8,20.0 41.2,19.5 41.0,18.8
             C 40.5,17.2 39.0,15.5 37.8,14.0
             C 37.2,12.5 36.5,10.0 36.0,7.0
             C 35.8,5.2 35.0,3.5 34.5,3.0
             L 27.8,10.5
             C 26.8,11.2 24.5,12.0 22.5,12.5 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Outer White Contour for High-Definition Contrast */}
        <path
          d="M 17.2,10.5
             L 10.5,3.0
             C 9.8,3.5 9.0,5.2 8.8,7.0
             C 8.2,10.0 7.6,12.5 7.0,14.0
             C 5.8,15.5 4.5,17.2 4.0,18.8
             C 3.8,19.5 4.2,20.0 5.2,19.8
             C 6.8,19.5 7.8,19.2 8.5,20.2
             C 7.0,21.8 5.2,23.5 5.0,24.5
             C 4.8,25.3 5.5,25.5 6.8,25.2
             C 8.2,24.8 9.5,24.2 10.5,25.5
             C 11.8,27.2 12.8,29.8 13.5,33.0
             M 31.5,33.0
             C 32.2,29.8 33.2,27.2 34.5,25.5
             C 35.5,24.2 36.8,24.8 38.2,25.2
             C 39.5,25.5 40.2,25.3 40.0,24.5
             C 39.8,23.5 38.0,21.8 36.5,20.2
             C 37.2,19.2 38.2,19.5 39.8,19.8
             C 40.8,20.0 41.2,19.5 41.0,18.8
             C 40.5,17.2 39.0,15.5 37.8,14.0
             C 37.2,12.5 36.5,10.0 36.0,7.0
             C 35.8,5.2 35.0,3.5 34.5,3.0
             L 27.8,10.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.2' }}
        />

        {/* Glowing Ruby Crimson Inner Ears with White Edge */}
        <path
          d="M 11.0,5.2 C 9.8,8.5 9.0,12.0 9.8,13.8 C 10.8,14.5 13.5,13.8 15.5,11.8 C 14.8,9.5 13.0,7.0 11.0,5.2 Z"
          style={{ fill: '#ef5350', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <path
          d="M 34.0,5.2 C 35.2,8.5 36.0,12.0 35.2,13.8 C 34.2,14.5 31.5,13.8 29.5,11.8 C 30.2,9.5 32.0,7.0 34.0,5.2 Z"
          style={{ fill: '#ef5350', stroke: '#ffffff', strokeWidth: '1' }}
        />

        {/* Forehead Blaze in White */}
        <path
          d="M 22.5,12.5 L 22.5,16.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.1' }}
        />

        {/* Luminous Almond Fox Eyes with Ebony Pupil */}
        <path
          d="M 13.0,17.2 C 14.2,16.0 16.8,16.8 18.2,19.2 C 16.5,19.8 14.5,19.2 13.0,17.2 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="15.8" cy="18.0" r="0.65" style={{ fill: '#000000', stroke: 'none' }} />
        <path
          d="M 13.0,17.2 C 11.5,17.0 10.2,17.5 9.2,18.2"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        <path
          d="M 32.0,17.2 C 30.8,16.0 28.2,16.8 26.8,19.2 C 28.5,19.8 30.5,19.2 32.0,17.2 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="29.2" cy="18.0" r="0.65" style={{ fill: '#000000', stroke: 'none' }} />
        <path
          d="M 32.0,17.2 C 33.5,17.0 34.8,17.5 35.8,18.2"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Long Slender Muzzle Bridge in White */}
        <path
          d="M 18.2,19.2 C 19.5,22.0 20.8,24.8 21.0,26.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.1' }}
        />
        <path
          d="M 26.8,19.2 C 25.5,22.0 24.2,24.8 24.0,26.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.1' }}
        />

        {/* Cheek-to-Snout Mask Contours in White */}
        <path
          d="M 10.5,24.5 C 13.5,23.5 17.0,24.8 19.5,26.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />
        <path
          d="M 34.5,24.5 C 31.5,23.5 28.0,24.8 25.5,26.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Crisp White Fox Nose Pad */}
        <path
          d="M 21.0,26.5 C 21.0,26.0 24.0,26.0 24.0,26.5 C 24.0,27.5 22.8,28.4 22.5,28.4 C 22.2,28.4 21.0,27.5 21.0,26.5 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.5' }}
        />

        {/* Vulpine Mouth & Tapered Chin in White */}
        <path
          d="M 22.5,28.4 L 22.5,29.3 M 20.8,29.8 C 21.8,30.2 23.2,30.2 24.2,29.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.9' }}
        />
        <path
          d="M 20.0,30.8 C 21.2,31.5 23.8,31.5 25.0,30.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.0' }}
        />

        {/* Flowing Chest Fur Bib in White */}
        <path
          d="M 16.5,33.0 C 17.5,31.2 19.8,30.5 22.5,30.5 C 25.2,30.5 27.5,31.2 28.5,33.0"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.9' }}
        />
      </g>
    </svg>
  )
}

// ---------------------------------------------------------------------------
// White Normal Fox (f):
// High-Staunton monochrome sculpture adorned with an exquisite half-queen
// filigree tiara, refined vulpine muzzle, and soft inner-ear fluting.
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

        {/* Sculpted Fox Bust */}
        <path
          d="M 22.5,12.5
             C 20.5,12.0 18.2,11.2 17.2,10.5
             L 10.5,3.0
             C 9.8,3.5 9.0,5.2 8.8,7.0
             C 8.2,10.0 7.6,12.5 7.0,14.0
             C 5.8,15.5 4.5,17.2 4.0,18.8
             C 3.8,19.5 4.2,20.0 5.2,19.8
             C 6.8,19.5 7.8,19.2 8.5,20.2
             C 7.0,21.8 5.2,23.5 5.0,24.5
             C 4.8,25.3 5.5,25.5 6.8,25.2
             C 8.2,24.8 9.5,24.2 10.5,25.5
             C 11.8,27.2 12.8,29.8 13.5,33.0
             L 31.5,33.0
             C 32.2,29.8 33.2,27.2 34.5,25.5
             C 35.5,24.2 36.8,24.8 38.2,25.2
             C 39.5,25.5 40.2,25.3 40.0,24.5
             C 39.8,23.5 38.0,21.8 36.5,20.2
             C 37.2,19.2 38.2,19.5 39.8,19.8
             C 40.8,20.0 41.2,19.5 41.0,18.8
             C 40.5,17.2 39.0,15.5 37.8,14.0
             C 37.2,12.5 36.5,10.0 36.0,7.0
             C 35.8,5.2 35.0,3.5 34.5,3.0
             L 27.8,10.5
             C 26.8,11.2 24.5,12.0 22.5,12.5 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Inner Ears with Staunton Fluting Lines */}
        <path
          d="M 11.0,5.2 C 9.8,8.5 9.0,12.0 9.8,13.8 C 10.8,14.5 13.5,13.8 15.5,11.8 C 14.8,9.5 13.0,7.0 11.0,5.2 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1' }}
        />
        <path
          d="M 11.5,8.0 C 10.8,10.2 10.5,12.0 11.2,12.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.7' }}
        />

        <path
          d="M 34.0,5.2 C 35.2,8.5 36.0,12.0 35.2,13.8 C 34.2,14.5 31.5,13.8 29.5,11.8 C 30.2,9.5 32.0,7.0 34.0,5.2 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1' }}
        />
        <path
          d="M 33.5,8.0 C 34.2,10.2 34.5,12.0 33.8,12.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.7' }}
        />

        {/* Royal Half-Queen Tiara Diadem & Jewel */}
        <path
          d="M 18.5,12.2 C 19.2,9.8 20.2,8.2 20.8,7.6 C 21.4,9.2 22.0,10.2 22.5,10.2 C 23.0,10.2 23.6,9.2 24.2,7.6 C 24.8,8.2 25.8,9.8 26.5,12.2 Z"
          style={{ fill: '#ffffff', stroke: '#000000', strokeWidth: '1' }}
        />
        <circle cx="22.5" cy="6.6" r="0.85" style={{ fill: '#000000', stroke: 'none' }} />

        {/* Slanted Almond Vulpine Eyes */}
        <path
          d="M 13.0,17.2 C 14.2,16.0 16.8,16.8 18.2,19.2 C 16.5,19.8 14.5,19.2 13.0,17.2 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="15.8" cy="18.0" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />
        <path
          d="M 13.0,17.2 C 11.5,17.0 10.2,17.5 9.2,18.2"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        <path
          d="M 32.0,17.2 C 30.8,16.0 28.2,16.8 26.8,19.2 C 28.5,19.8 30.5,19.2 32.0,17.2 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.4' }}
        />
        <circle cx="29.2" cy="18.0" r="0.65" style={{ fill: '#ffffff', stroke: 'none' }} />
        <path
          d="M 32.0,17.2 C 33.5,17.0 34.8,17.5 35.8,18.2"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Long Slender Muzzle Bridge */}
        <path
          d="M 18.2,19.2 C 19.5,22.0 20.8,24.8 21.0,26.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.1' }}
        />
        <path
          d="M 26.8,19.2 C 25.5,22.0 24.2,24.8 24.0,26.5"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.1' }}
        />

        {/* Cheek-to-Snout Mask Contours */}
        <path
          d="M 10.5,24.5 C 13.5,23.5 17.0,24.8 19.5,26.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />
        <path
          d="M 34.5,24.5 C 31.5,23.5 28.0,24.8 25.5,26.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.8' }}
        />

        {/* Fox Nose Pad */}
        <path
          d="M 21.0,26.5 C 21.0,26.0 24.0,26.0 24.0,26.5 C 24.0,27.5 22.8,28.4 22.5,28.4 C 22.2,28.4 21.0,27.5 21.0,26.5 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '0.5' }}
        />

        {/* Vulpine Mouth & Tapered Chin */}
        <path
          d="M 22.5,28.4 L 22.5,29.3 M 20.8,29.8 C 21.8,30.2 23.2,30.2 24.2,29.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '0.9' }}
        />
        <path
          d="M 20.0,30.8 C 21.2,31.5 23.8,31.5 25.0,30.8"
          style={{ fill: 'none', stroke: '#000000', strokeWidth: '1.0' }}
        />

        {/* Flowing Chest Fur Bib */}
        <path
          d="M 16.5,33.0 C 17.5,31.2 19.8,30.5 22.5,30.5 C 25.2,30.5 27.5,31.2 28.5,33.0"
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

        {/* Sculpted Fox Bust */}
        <path
          d="M 22.5,12.5
             C 20.5,12.0 18.2,11.2 17.2,10.5
             L 10.5,3.0
             C 9.8,3.5 9.0,5.2 8.8,7.0
             C 8.2,10.0 7.6,12.5 7.0,14.0
             C 5.8,15.5 4.5,17.2 4.0,18.8
             C 3.8,19.5 4.2,20.0 5.2,19.8
             C 6.8,19.5 7.8,19.2 8.5,20.2
             C 7.0,21.8 5.2,23.5 5.0,24.5
             C 4.8,25.3 5.5,25.5 6.8,25.2
             C 8.2,24.8 9.5,24.2 10.5,25.5
             C 11.8,27.2 12.8,29.8 13.5,33.0
             L 31.5,33.0
             C 32.2,29.8 33.2,27.2 34.5,25.5
             C 35.5,24.2 36.8,24.8 38.2,25.2
             C 39.5,25.5 40.2,25.3 40.0,24.5
             C 39.8,23.5 38.0,21.8 36.5,20.2
             C 37.2,19.2 38.2,19.5 39.8,19.8
             C 40.8,20.0 41.2,19.5 41.0,18.8
             C 40.5,17.2 39.0,15.5 37.8,14.0
             C 37.2,12.5 36.5,10.0 36.0,7.0
             C 35.8,5.2 35.0,3.5 34.5,3.0
             L 27.8,10.5
             C 26.8,11.2 24.5,12.0 22.5,12.5 Z"
          style={{ fill: '#000000', stroke: '#000000', strokeWidth: '1.5' }}
        />

        {/* Outer White Contour */}
        <path
          d="M 17.2,10.5
             L 10.5,3.0
             C 9.8,3.5 9.0,5.2 8.8,7.0
             C 8.2,10.0 7.6,12.5 7.0,14.0
             C 5.8,15.5 4.5,17.2 4.0,18.8
             C 3.8,19.5 4.2,20.0 5.2,19.8
             C 6.8,19.5 7.8,19.2 8.5,20.2
             C 7.0,21.8 5.2,23.5 5.0,24.5
             C 4.8,25.3 5.5,25.5 6.8,25.2
             C 8.2,24.8 9.5,24.2 10.5,25.5
             C 11.8,27.2 12.8,29.8 13.5,33.0
             M 31.5,33.0
             C 32.2,29.8 33.2,27.2 34.5,25.5
             C 35.5,24.2 36.8,24.8 38.2,25.2
             C 39.5,25.5 40.2,25.3 40.0,24.5
             C 39.8,23.5 38.0,21.8 36.5,20.2
             C 37.2,19.2 38.2,19.5 39.8,19.8
             C 40.8,20.0 41.2,19.5 41.0,18.8
             C 40.5,17.2 39.0,15.5 37.8,14.0
             C 37.2,12.5 36.5,10.0 36.0,7.0
             C 35.8,5.2 35.0,3.5 34.5,3.0
             L 27.8,10.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.2' }}
        />

        {/* Inner Ears with White Fluting Lines */}
        <path
          d="M 11.0,5.2 C 9.8,8.5 9.0,12.0 9.8,13.8 C 10.8,14.5 13.5,13.8 15.5,11.8 C 14.8,9.5 13.0,7.0 11.0,5.2 Z"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <path
          d="M 11.5,8.0 C 10.8,10.2 10.5,12.0 11.2,12.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.7' }}
        />

        <path
          d="M 34.0,5.2 C 35.2,8.5 36.0,12.0 35.2,13.8 C 34.2,14.5 31.5,13.8 29.5,11.8 C 30.2,9.5 32.0,7.0 34.0,5.2 Z"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <path
          d="M 33.5,8.0 C 34.2,10.2 34.5,12.0 33.8,12.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.7' }}
        />

        {/* Royal Half-Queen Tiara Diadem & Jewel in White */}
        <path
          d="M 18.5,12.2 C 19.2,9.8 20.2,8.2 20.8,7.6 C 21.4,9.2 22.0,10.2 22.5,10.2 C 23.0,10.2 23.6,9.2 24.2,7.6 C 24.8,8.2 25.8,9.8 26.5,12.2 Z"
          style={{ fill: '#000000', stroke: '#ffffff', strokeWidth: '1' }}
        />
        <circle cx="22.5" cy="6.6" r="0.85" style={{ fill: '#ffffff', stroke: 'none' }} />

        {/* Slanted Almond Vulpine Eyes */}
        <path
          d="M 13.0,17.2 C 14.2,16.0 16.8,16.8 18.2,19.2 C 16.5,19.8 14.5,19.2 13.0,17.2 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="15.8" cy="18.0" r="0.65" style={{ fill: '#000000', stroke: 'none' }} />
        <path
          d="M 13.0,17.2 C 11.5,17.0 10.2,17.5 9.2,18.2"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        <path
          d="M 32.0,17.2 C 30.8,16.0 28.2,16.8 26.8,19.2 C 28.5,19.8 30.5,19.2 32.0,17.2 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.4' }}
        />
        <circle cx="29.2" cy="18.0" r="0.65" style={{ fill: '#000000', stroke: 'none' }} />
        <path
          d="M 32.0,17.2 C 33.5,17.0 34.8,17.5 35.8,18.2"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Muzzle Bridge in White */}
        <path
          d="M 18.2,19.2 C 19.5,22.0 20.8,24.8 21.0,26.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.1' }}
        />
        <path
          d="M 26.8,19.2 C 25.5,22.0 24.2,24.8 24.0,26.5"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.1' }}
        />

        {/* Cheek-to-Snout Mask Contours in White */}
        <path
          d="M 10.5,24.5 C 13.5,23.5 17.0,24.8 19.5,26.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />
        <path
          d="M 34.5,24.5 C 31.5,23.5 28.0,24.8 25.5,26.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.8' }}
        />

        {/* Fox Nose Pad in White */}
        <path
          d="M 21.0,26.5 C 21.0,26.0 24.0,26.0 24.0,26.5 C 24.0,27.5 22.8,28.4 22.5,28.4 C 22.2,28.4 21.0,27.5 21.0,26.5 Z"
          style={{ fill: '#ffffff', stroke: '#ffffff', strokeWidth: '0.5' }}
        />

        {/* Vulpine Mouth & Tapered Chin in White */}
        <path
          d="M 22.5,28.4 L 22.5,29.3 M 20.8,29.8 C 21.8,30.2 23.2,30.2 24.2,29.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '0.9' }}
        />
        <path
          d="M 20.0,30.8 C 21.2,31.5 23.8,31.5 25.0,30.8"
          style={{ fill: 'none', stroke: '#ffffff', strokeWidth: '1.0' }}
        />

        {/* Flowing Chest Fur Bib in White */}
        <path
          d="M 16.5,33.0 C 17.5,31.2 19.8,30.5 22.5,30.5 C 25.2,30.5 27.5,31.2 28.5,33.0"
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
