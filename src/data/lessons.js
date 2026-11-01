export const lessons = [
  {
    id: 1,
    title: 'Opening Principles: Control the Center',
    difficulty: 'Beginner',
    minutes: 12,
    description:
      'Why the center matters, and how the first four moves of the Italian and Queen’s Gambit set up the whole game.',
    coachSummary:
      'The four central squares (d4, e4, d5, e5 — plus α4/β4/α7/β7 in 10×10 Fox Chess) act as the highway intersection of the board. Pieces placed in or aiming at the center command nearly twice as many squares as pieces stuck on the rim.',
    keyTakeaways: [
      'Stake a claim in the center immediately with a central pawn (1.e4 or 1.d4).',
      'Develop Knights and Foxes toward the center before moving Queen or flank pawns.',
      'Develop Bishops to active diagonals and castle early to tuck your King to safety.',
      'Avoid moving the same piece twice in the opening unless winning material.',
    ],
    steps: [
      {
        title: 'Step 1: Stake Out the Center (1. e2 → e4)',
        notation: '1. e4',
        commentary:
          'White advances the King’s pawn two squares to e4. This immediately occupies a central square, attacks d5 and f5, and opens diagonals for both the White Queen and light-squared Bishop.',
        actor: { code: 'wP', from: { row: 6, col: 4 }, to: { row: 4, col: 4 }, isJump: false },
        highlights: [
          { row: 3, col: 3, tone: 'attack' },
          { row: 3, col: 5, tone: 'attack' },
          { row: 4, col: 4, tone: 'center' },
        ],
        pieces: [
          { row: 7, col: 4, code: 'wK' },
          { row: 7, col: 3, code: 'wQ' },
          { row: 7, col: 5, code: 'wB' },
          { row: 7, col: 6, code: 'wN' },
          { row: 6, col: 3, code: 'wP' },
          { row: 0, col: 4, code: 'bK' },
          { row: 1, col: 4, code: 'bP' },
          { row: 0, col: 1, code: 'bN' },
        ],
      },
      {
        title: 'Step 2: Develop with a Threat (2. Ng1 → f3)',
        notation: '1... e5 2. Nf3',
        commentary:
          'After Black replies 1...e5, White develops the Knight to f3 — its best natural square. From f3, the Knight attacks Black’s e5 pawn, controls d4, and clears the path for Kingside castling.',
        actor: { code: 'wN', from: { row: 7, col: 6 }, to: { row: 5, col: 5 }, isJump: true },
        highlights: [
          { row: 3, col: 4, tone: 'attack' },
          { row: 4, col: 3, tone: 'center' },
        ],
        pieces: [
          { row: 7, col: 4, code: 'wK' },
          { row: 7, col: 5, code: 'wB' },
          { row: 4, col: 4, code: 'wP' },
          { row: 0, col: 4, code: 'bK' },
          { row: 3, col: 4, code: 'bP' },
          { row: 2, col: 2, code: 'bN' },
        ],
      },
      {
        title: 'Step 3: The Italian Bishop (3. Bf1 → c4)',
        notation: '2... Nc6 3. Bc4',
        commentary:
          'White deploys the Bishop to c4 (the Italian Game), slicing across the center and aiming directly at f7 — the weakest square in Black’s camp, defended only by the Black King!',
        actor: { code: 'wB', from: { row: 7, col: 5 }, to: { row: 4, col: 2 }, isJump: false },
        highlights: [
          { row: 1, col: 5, tone: 'attack' },
          { row: 3, col: 3, tone: 'center' },
        ],
        pieces: [
          { row: 7, col: 4, code: 'wK' },
          { row: 7, col: 7, code: 'wR' },
          { row: 5, col: 5, code: 'wN' },
          { row: 4, col: 4, code: 'wP' },
          { row: 0, col: 4, code: 'bK' },
          { row: 1, col: 5, code: 'bP' },
          { row: 3, col: 4, code: 'bP' },
          { row: 2, col: 2, code: 'bN' },
        ],
      },
    ],
    puzzle: {
      prompt:
        'Practice Challenge: White’s Pawn is on e4 and Knight is on f3. Click the best central break square for the d2 Pawn to challenge the center!',
      actor: { code: 'wP', from: { row: 6, col: 3 } },
      solution: {
        row: 4,
        col: 3,
        notation: 'd4!',
        explanation:
          'Correct! Advancing d2 → d4 strikes directly at the center, opens lines for the dark-squared Bishop, and seizes space with tempo.',
      },
      options: [
        { row: 5, col: 3, label: 'd3' },
        { row: 4, col: 3, label: 'd4' },
      ],
      pieces: [
        { row: 7, col: 4, code: 'wK' },
        { row: 5, col: 5, code: 'wN' },
        { row: 4, col: 2, code: 'wB' },
        { row: 4, col: 4, code: 'wP' },
        { row: 0, col: 4, code: 'bK' },
        { row: 3, col: 4, code: 'bP' },
        { row: 2, col: 2, code: 'bN' },
      ],
    },
  },
  {
    id: 2,
    title: 'Tactics 101: Forks and Pins',
    difficulty: 'Beginner',
    minutes: 18,
    description:
      'The two patterns that decide most club games, with ten find-the-move positions to train your eye.',
    coachSummary:
      'Tactics win material by creating simultaneous threats your opponent cannot answer in a single turn. A Fork attacks two targets at once with one piece; a Pin freezes an enemy piece that shields a more valuable piece behind it.',
    keyTakeaways: [
      'Knights and Red-eared Foxes are supreme forking pieces because their jump attacks cannot be blocked.',
      'Look for enemy King + Queen or King + Rook alignments on the same color squares.',
      'Absolute Pins (against the King) make it illegal for the pinned piece to move at all.',
      'Always Pile Up on a pinned piece with pawns and minor pieces rather than capturing immediately.',
    ],
    steps: [
      {
        title: 'Step 1: The Royal Knight Fork (Nd5 → c7+)',
        notation: '1. Nc7+!',
        commentary:
          'White’s Knight leaps from d5 to c7, delivering Check to the Black King on e8 while simultaneously attacking the Black Rook on a8! Black must move the King and loses the Rook.',
        actor: { code: 'wN', from: { row: 3, col: 3 }, to: { row: 1, col: 2 }, isJump: true },
        highlights: [
          { row: 0, col: 4, tone: 'attack' },
          { row: 0, col: 0, tone: 'attack' },
        ],
        pieces: [
          { row: 7, col: 6, code: 'wK' },
          { row: 0, col: 4, code: 'bK' },
          { row: 0, col: 0, code: 'bR' },
          { row: 2, col: 3, code: 'bP' },
        ],
      },
      {
        title: 'Step 2: The Absolute Diagonal Pin (Bf1 → b5)',
        notation: '1. Bb5',
        commentary:
          'White’s Bishop slides to b5, pinning the Black Knight on c6 against the Black King on e8. Because moving the Knight would expose the King to check, the c6 Knight is completely paralyzed!',
        actor: { code: 'wB', from: { row: 7, col: 5 }, to: { row: 3, col: 1 }, isJump: false },
        highlights: [
          { row: 2, col: 2, tone: 'attack' },
          { row: 0, col: 4, tone: 'attack' },
        ],
        pieces: [
          { row: 7, col: 6, code: 'wK' },
          { row: 0, col: 4, code: 'bK' },
          { row: 2, col: 2, code: 'bN' },
          { row: 1, col: 3, code: 'bP' },
        ],
      },
    ],
    puzzle: {
      prompt:
        'Practice Challenge: White’s Knight is on e5. Click the square that delivers a Royal Fork against Black’s King (e8) and Queen (d8)!',
      actor: { code: 'wN', from: { row: 3, col: 4 } },
      solution: {
        row: 1,
        col: 5,
        notation: 'Nf7+!',
        explanation:
          'Brilliant! Nf7+ forks the Black King on e8 and the Black Queen on d8 (and Rook on h8), winning decisive material.',
      },
      options: [
        { row: 1, col: 3, label: 'Nd7' },
        { row: 1, col: 5, label: 'Nf7+' },
        { row: 2, col: 2, label: 'Nc6' },
      ],
      pieces: [
        { row: 7, col: 6, code: 'wK' },
        { row: 0, col: 4, code: 'bK' },
        { row: 0, col: 3, code: 'bQ' },
        { row: 0, col: 7, code: 'bR' },
      ],
    },
  },
  {
    id: 3,
    title: 'Pawn Structure: The Isolated Queen Pawn',
    difficulty: 'Intermediate',
    minutes: 25,
    description:
      'How to play the IQP with the initiative — and how to trade it away when the endgame approaches.',
    coachSummary:
      'An Isolated Queen Pawn (IQP) on d4 has no friendly pawns on the c- or e-files to protect it. In return, it grants open c- and e-files for your Rooks, strong outpost squares on e5 and c5, and a dynamic d4–d5 central breakthrough.',
    keyTakeaways: [
      'With an IQP, keep pieces on the board and play for an attack — avoid simplifying into a sterile endgame.',
      'Use the e5 square as a launchpad for your Knight and aim your Bishops at the enemy Kingside.',
      'Time the d4–d5 pawn break to rip open diagonals against the opponent’s King or dissolve the isolated pawn.',
      'When playing AGAINST an IQP, blockade the square directly in front of it (d5) with a Knight!',
    ],
    steps: [
      {
        title: 'Step 1: Outpost Control on e5 (Nf3 → e5)',
        notation: '1. Ne5!',
        commentary:
          'Supported by the d4 Isolated Queen Pawn, White’s Knight leaps into the powerful e5 outpost, dominating the center and pressuring f7 and c6.',
        actor: { code: 'wN', from: { row: 5, col: 5 }, to: { row: 3, col: 4 }, isJump: true },
        highlights: [
          { row: 4, col: 3, tone: 'defend' },
          { row: 3, col: 4, tone: 'center' },
        ],
        pieces: [
          { row: 7, col: 6, code: 'wK' },
          { row: 4, col: 3, code: 'wP' },
          { row: 5, col: 3, code: 'wB' },
          { row: 0, col: 6, code: 'bK' },
          { row: 2, col: 5, code: 'bN' },
        ],
      },
      {
        title: 'Step 2: The Dynamic d4–d5 Breakthrough!',
        notation: '2. d5!',
        commentary:
          'Before Black can establish a permanent blockade on d5, White pushes d4 → d5! This liquidates the isolated pawn and unleashes White’s Bishops and Rooks across open central lines.',
        actor: { code: 'wP', from: { row: 4, col: 3 }, to: { row: 3, col: 3 }, isJump: false },
        highlights: [
          { row: 3, col: 3, tone: 'center' },
          { row: 2, col: 4, tone: 'attack' },
        ],
        pieces: [
          { row: 7, col: 6, code: 'wK' },
          { row: 7, col: 3, code: 'wR' },
          { row: 5, col: 3, code: 'wB' },
          { row: 0, col: 6, code: 'bK' },
          { row: 2, col: 4, code: 'bP' },
        ],
      },
    ],
    puzzle: {
      prompt:
        'Practice Challenge: You are playing with the d4 IQP and Black’s pieces are passive. Click the square that unleashes the central breakthrough!',
      actor: { code: 'wP', from: { row: 4, col: 3 } },
      solution: {
        row: 3,
        col: 3,
        notation: 'd5!',
        explanation:
          'Spot on! Pushing d4 → d5 breaks Black’s blockade, opens the d-file for your Rook, and activates your Bishop.',
      },
      options: [{ row: 3, col: 3, label: 'd5!' }],
      pieces: [
        { row: 7, col: 6, code: 'wK' },
        { row: 7, col: 3, code: 'wR' },
        { row: 6, col: 1, code: 'wB' },
        { row: 0, col: 6, code: 'bK' },
        { row: 2, col: 4, code: 'bP' },
      ],
    },
  },
  {
    id: 4,
    title: 'Endgames: King and Pawn Basics',
    difficulty: 'Beginner',
    minutes: 20,
    description:
      'Opposition, the square of the pawn, and when a single pawn is enough to win.',
    coachSummary:
      'In King and Pawn endgames, the King transforms from a sheltered monarch into a fighting piece. To promote a single pawn, your King must lead the way in front of the pawn and seize Direct Opposition.',
    keyTakeaways: [
      'King in Front of the Pawn: Always advance your King ahead of your passed pawn before pushing the pawn.',
      'Direct Opposition: Two Kings stand on the same file or rank separated by 1 square; whoever does NOT have to move holds the opposition.',
      'Key Squares: For a pawn on the 5th rank, the three squares directly in front of it on the 6th rank are all winning key squares.',
      'Rule of the Square: Can the defending King step inside the diagonal square of the runaway pawn?',
    ],
    steps: [
      {
        title: 'Step 1: Seizing Direct Opposition (Kd5 → e6!)',
        notation: '1. Ke6!',
        commentary:
          'White steps the King in front of the e4 pawn to e6, standing directly nose-to-nose with Black’s King on e8 with one square between them. Black is forced to give way to d8 or f8!',
        actor: { code: 'wK', from: { row: 3, col: 3 }, to: { row: 2, col: 4 }, isJump: false },
        highlights: [
          { row: 2, col: 4, tone: 'center' },
          { row: 0, col: 4, tone: 'attack' },
        ],
        pieces: [
          { row: 4, col: 4, code: 'wP' },
          { row: 0, col: 4, code: 'bK' },
        ],
      },
      {
        title: 'Step 2: Outflanking to Escort Promotion (Ke6 → f7)',
        notation: '1... Kd8 2. Kf7!',
        commentary:
          'When Black’s King retreats to d8, White outflanks to f7 — now controlling e8, e7, and e6 so the e-pawn can march all the way to promotion unopposed!',
        actor: { code: 'wK', from: { row: 2, col: 4 }, to: { row: 1, col: 5 }, isJump: false },
        highlights: [
          { row: 0, col: 4, tone: 'center' },
          { row: 1, col: 4, tone: 'defend' },
        ],
        pieces: [
          { row: 3, col: 4, code: 'wP' },
          { row: 0, col: 3, code: 'bK' },
        ],
      },
    ],
    puzzle: {
      prompt:
        'Practice Challenge: Black’s King is on e7 and White’s King is on d4 (with a pawn on e3). Click the square that seizes Direct Opposition!',
      actor: { code: 'wK', from: { row: 4, col: 3 } },
      solution: {
        row: 3,
        col: 4,
        notation: 'Ke5!',
        explanation:
          'Exact! Ke5 places your King in front of your pawn and takes Direct Opposition against the Black King on e7 (one square apart on the e-file).',
      },
      options: [
        { row: 3, col: 3, label: 'Kd5' },
        { row: 3, col: 4, label: 'Ke5!' },
        { row: 4, col: 4, label: 'Ke4' },
      ],
      pieces: [
        { row: 5, col: 4, code: 'wP' },
        { row: 1, col: 4, code: 'bK' },
      ],
    },
  },
  {
    id: 5,
    title: 'The Botvinnik System',
    difficulty: 'Advanced',
    minutes: 30,
    description:
      'A deep dive into the Botvinnik variation of the Semi-Slav, with model games from the world champions who built it.',
    coachSummary:
      'One of the sharpest battlegrounds in chess theory: Black captures on c4 and holds the extra pawn with ...b5, while White builds a massive central phalanx with e2–e4–e5. Dynamic calculation outweighs static material count.',
    keyTakeaways: [
      'Black grabs the c4 pawn (...dxc4) and defends it with ...b5 and ...Bb7.',
      'White counterattacks in the center with e4 and e5, driving Black’s f6 Knight away.',
      'White’s Bg5 pin and exf6 capture shatter Black’s shielding pawns in exchange for Black’s passed c-pawn.',
      'Both sides must calculate concrete forcing variations move-by-move.',
    ],
    steps: [
      {
        title: 'Step 1: White Claims the Full Center (e3 → e4)',
        notation: '6. e4',
        commentary:
          'After Black captures 5...dxc4 in the Bg5 Semi-Slav, White refuses to spend time recovering the c4 pawn quietly and instead seizes the entire center with 6.e4!',
        actor: { code: 'wP', from: { row: 5, col: 4 }, to: { row: 4, col: 4 }, isJump: false },
        highlights: [
          { row: 4, col: 3, tone: 'center' },
          { row: 4, col: 4, tone: 'center' },
        ],
        pieces: [
          { row: 7, col: 4, code: 'wK' },
          { row: 4, col: 3, code: 'wP' },
          { row: 3, col: 6, code: 'wB' },
          { row: 5, col: 2, code: 'wN' },
          { row: 0, col: 4, code: 'bK' },
          { row: 4, col: 2, code: 'bP' },
          { row: 2, col: 5, code: 'bN' },
        ],
      },
      {
        title: 'Step 2: The Spearhead Advance (e4 → e5)',
        notation: '6... b5 7. e5!',
        commentary:
          'When Black clings to the c4 pawn with ...b5, White drives the e-pawn forward to e5 — attacking the pinned Knight on f6 and launching the famous Botvinnik labyrinth.',
        actor: { code: 'wP', from: { row: 4, col: 4 }, to: { row: 3, col: 4 }, isJump: false },
        highlights: [{ row: 2, col: 5, tone: 'attack' }],
        pieces: [
          { row: 7, col: 4, code: 'wK' },
          { row: 4, col: 3, code: 'wP' },
          { row: 3, col: 6, code: 'wB' },
          { row: 0, col: 4, code: 'bK' },
          { row: 3, col: 1, code: 'bP' },
          { row: 4, col: 2, code: 'bP' },
          { row: 2, col: 5, code: 'bN' },
        ],
      },
    ],
    puzzle: {
      prompt:
        'Practice Challenge: Black’s Knight on f6 is pinned by your Bishop on g5, and your pawn sits on e4. Click the square that spearheads the Botvinnik attack!',
      actor: { code: 'wP', from: { row: 4, col: 4 } },
      solution: {
        row: 3,
        col: 4,
        notation: 'e5!',
        explanation:
          'Correct! 7.e5 attacks the pinned Knight on f6, forcing Black into the sharp forcing lines of the Botvinnik System.',
      },
      options: [{ row: 3, col: 4, label: 'e5!' }],
      pieces: [
        { row: 7, col: 4, code: 'wK' },
        { row: 4, col: 3, code: 'wP' },
        { row: 3, col: 6, code: 'wB' },
        { row: 0, col: 4, code: 'bK' },
        { row: 2, col: 5, code: 'bN' },
        { row: 0, col: 3, code: 'bQ' },
      ],
    },
  },
  {
    id: 6,
    title: 'Calculation: Candidate Moves',
    difficulty: 'Intermediate',
    minutes: 22,
    description:
      'A repeatable method for finding candidate moves and pruning the ones that do not change the position.',
    coachSummary:
      'Coined by Grandmaster Alexander Kotov, the Candidate Moves method prevents aimless drifting in your calculation. Always scan forcing moves in strict priority order: (1) Checks, (2) Captures, and (3) Threats.',
    keyTakeaways: [
      'Step 1: List 2 to 4 plausible Candidate Moves before calculating deep variations.',
      'Step 2: Always check forcing moves first — Checks, Captures, and direct Threats (CCT).',
      'Step 3: If your first move works, also check if reversing the move order (intermezzo / Zwischenzug) is even stronger!',
      'Calculate each branch once, clearly and methodically, rather than jumping back and forth.',
    ],
    steps: [
      {
        title: 'Step 1: Scan All Checks First (Rd1 → d8#)',
        notation: '1. Rd8#!',
        commentary:
          'Because Black’s back rank is unguarded and trapped behind its own f7, g7, h7 pawns, scanning Checks first immediately spots the fatal back-rank checkmate Rd1 → d8#!',
        actor: { code: 'wR', from: { row: 7, col: 3 }, to: { row: 0, col: 3 }, isJump: false },
        highlights: [
          { row: 0, col: 3, tone: 'attack' },
          { row: 0, col: 6, tone: 'attack' },
        ],
        pieces: [
          { row: 7, col: 6, code: 'wK' },
          { row: 0, col: 6, code: 'bK' },
          { row: 1, col: 5, code: 'bP' },
          { row: 1, col: 6, code: 'bP' },
          { row: 1, col: 7, code: 'bP' },
        ],
      },
      {
        title: 'Step 2: The Zwischenzug (In-Between Check)',
        notation: '1.Bb5+! before recapturing',
        commentary:
          'Instead of automatically recapturing a piece, always ask: "Do I have an in-between Check (Zwischenzug) first?" Inserting Bb5+ wins a tempo and improves your piece before taking back.',
        actor: { code: 'wB', from: { row: 6, col: 4 }, to: { row: 3, col: 1 }, isJump: false },
        highlights: [{ row: 0, col: 4, tone: 'attack' }],
        pieces: [
          { row: 7, col: 6, code: 'wK' },
          { row: 0, col: 4, code: 'bK' },
          { row: 3, col: 3, code: 'bN' },
        ],
      },
    ],
    puzzle: {
      prompt:
        'Practice Challenge: Use the Checks-Captures-Threats checklist! White’s Rook is on d1 and Black’s King on g8 is hemmed in by pawns on f7, g7, h7. Click the winning square!',
      actor: { code: 'wR', from: { row: 7, col: 3 } },
      solution: {
        row: 0,
        col: 3,
        notation: 'Rd8#!',
        explanation:
          'Checkmate! Scanning Checks first immediately reveals Rd8# — a classic back-rank mate.',
      },
      options: [
        { row: 3, col: 3, label: 'Rd5' },
        { row: 1, col: 3, label: 'Rd7' },
        { row: 0, col: 3, label: 'Rd8#!' },
      ],
      pieces: [
        { row: 7, col: 6, code: 'wK' },
        { row: 0, col: 6, code: 'bK' },
        { row: 1, col: 5, code: 'bP' },
        { row: 1, col: 6, code: 'bP' },
        { row: 1, col: 7, code: 'bP' },
      ],
    },
  },
]
