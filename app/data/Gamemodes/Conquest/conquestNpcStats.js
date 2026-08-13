/**
 * Conquest NPC stats distilled from Hemingway CT exports.
 * Regenerate: node scripts/import-conquest-npc-stats.js
 */
export const CONQUEST_POI_STATS_KEY = {
  "Order_Tower": "tower_t1",
  "Order_Tower-2": "tower_t2",
  "Order_Tower-3": "tower_t1",
  "Order_Tower-4": "tower_t2",
  "Order_Tower-5": "tower_t1",
  "Order_Tower-6": "tower_t2",
  "Chaos_Tower": "tower_t1",
  "Chaos_Tower-2": "tower_t2",
  "Chaos_Tower-3": "tower_t1",
  "Chaos_Tower-4": "tower_t2",
  "Chaos_Tower-5": "tower_t1",
  "Chaos_Tower-6": "tower_t2",
  "Order_Phoenix": "phoenix",
  "Order_Phoenix-2": "phoenix",
  "Order_Phoenix-3": "phoenix",
  "Chaos_Phoenix": "phoenix",
  "Chaos_Phoenix-2": "phoenix",
  "Chaos_Phoenix-3": "phoenix",
  "Order_Titan": "titan",
  "Chaos_Titan": "titan",
  "Blue": "camp_blue",
  "Blue-2": "camp_blue",
  "Red": "camp_red",
  "Red-2": "camp_red",
  "Purple": "camp_purple",
  "Purple-2": "camp_purple",
  "Speed": "camp_speed",
  "Speed-2": "camp_speed",
  "Trinket": "camp_trinket",
  "Trinket-2": "camp_trinket",
  "Trinket-3": "camp_trinket",
  "Trinket-4": "camp_trinket",
  "Trinket-5": "camp_trinket",
  "Trinket-6": "camp_trinket",
  "Cyclops": "camp_cyclops",
  "Cyclops-2": "camp_cyclops",
  "Cyclops-3": "camp_cyclops",
  "Cyclops-4": "camp_cyclops",
  "Scorpion": "camp_scorpion",
  "Scorpion-2": "camp_scorpion",
  "Rogues": "camp_rogues",
  "Rogues-2": "camp_rogues",
  "Oracles": "oracle",
  "Random": "camp_random",
  "Gold": "camp_gold",
  "Pyromancer": "pyromancer",
  "Gold_Fury": "gold_fury",
  "Fire_Giant": "fire_giant",
  "Totem": "totem",
  "Moonlight_Queen": "moonlight_queen",
  "Ritual_Site": "ritual_site",
  "Crystal": "crystal",
  "Crystal-2": "crystal",
  "Crystal-3": "crystal",
  "Crystal-4": "crystal",
  "Crystal-5": "crystal",
  "Crystal-6": "crystal",
  "Crystal-7": "crystal",
  "Crystal-8": "crystal"
};

/** @typedef {'camp_reward'|'boss_curve'|'static'|'objective'} ConquestScalingMode */

/**
 * @typedef {Object} ConquestNpcProfile
 * @property {string} file
 * @property {ConquestScalingMode} scaling
 * @property {{ hp:number, power:number, magicalPower:number, prot:number, magicalProt:number, xp:number, gold:number, teamXp:number, teamGold:number }} base
 * @property {Record<string, [number, number][]>} curves
 * @property {string[]} [uncertain]
 */

/** @type {Record<string, ConquestNpcProfile>} */
export const CONQUEST_NPC_PROFILES = {
  "tower_t1": {
    "file": "CT_Lane_Tower_T1_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          2500
        ]
      ],
      "PhysicalPower": [
        [
          1,
          225
        ]
      ],
      "MagicalPower": [
        [
          1,
          0
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          125
        ]
      ],
      "MagicalProtection": [
        [
          1,
          100
        ]
      ],
      "KillerXPReward": [
        [
          1,
          100
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          100
        ]
      ]
    },
    "base": {
      "hp": 2500,
      "power": 225,
      "magicalPower": 0,
      "prot": 125,
      "magicalProt": 100,
      "xp": 100,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 100
    },
    "scaling": "camp_reward",
    "blueprintRef": "tower_t1",
    "uncertain": []
  },
  "tower_t2": {
    "file": "CT_Lane_Tower_T2_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          3000
        ]
      ],
      "PhysicalPower": [
        [
          1,
          275
        ]
      ],
      "MagicalPower": [
        [
          1,
          0
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          135
        ]
      ],
      "MagicalProtection": [
        [
          1,
          120
        ]
      ],
      "KillerXPReward": [
        [
          1,
          200
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          125
        ]
      ]
    },
    "base": {
      "hp": 3000,
      "power": 275,
      "magicalPower": 0,
      "prot": 135,
      "magicalProt": 120,
      "xp": 200,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 125
    },
    "scaling": "camp_reward",
    "blueprintRef": "tower_t2",
    "uncertain": []
  },
  "phoenix": {
    "file": "CT_Lane_Phoenix_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          4000
        ]
      ],
      "PhysicalPower": [
        [
          1,
          325
        ]
      ],
      "MagicalPower": [
        [
          1,
          0
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          50
        ]
      ],
      "MagicalProtection": [
        [
          1,
          30
        ]
      ],
      "KillerXPReward": [
        [
          1,
          0
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          150
        ]
      ]
    },
    "base": {
      "hp": 4000,
      "power": 325,
      "magicalPower": 0,
      "prot": 50,
      "magicalProt": 30,
      "xp": 0,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 150
    },
    "scaling": "static",
    "blueprintRef": "phoenix",
    "uncertain": []
  },
  "titan": {
    "file": "CT_Lane_Titan_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          10000
        ]
      ],
      "PhysicalPower": [
        [
          1,
          225
        ]
      ],
      "MagicalPower": [
        [
          1,
          0
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          60
        ]
      ],
      "MagicalProtection": [
        [
          1,
          45
        ]
      ],
      "KillerXPReward": [
        [
          1,
          0
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ]
      ]
    },
    "base": {
      "hp": 10000,
      "power": 225,
      "magicalPower": 0,
      "prot": 60,
      "magicalProt": 45,
      "xp": 0,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "static",
    "blueprintRef": "titan",
    "uncertain": []
  },
  "camp_blue": {
    "file": "CT_Jungle_Alpha_Centaur_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          780
        ],
        [
          25,
          2580
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "MagicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "KillerXPReward": [
        [
          1,
          86
        ],
        [
          25,
          86
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          56
        ],
        [
          25,
          56
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 780,
      "power": 15,
      "magicalPower": 15,
      "prot": 25,
      "magicalProt": 25,
      "xp": 86,
      "gold": 56,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_blue",
    "uncertain": [
      "Blueprints: Primal Camp (Blue) · Centaur · Solo lane (NPE role Solo)."
    ]
  },
  "camp_red": {
    "file": "CT_Jungle_Alpha_Chimera_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          780
        ],
        [
          25,
          2580
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "MagicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "KillerXPReward": [
        [
          1,
          86
        ],
        [
          25,
          86
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          56
        ],
        [
          25,
          56
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 780,
      "power": 15,
      "magicalPower": 15,
      "prot": 25,
      "magicalProt": 25,
      "xp": 86,
      "gold": 56,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_red",
    "uncertain": [
      "Blueprints: Blight camp · Chimera family."
    ]
  },
  "camp_purple": {
    "file": "CT_Jungle_Alpha_Centaur_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          780
        ],
        [
          25,
          2580
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "MagicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "KillerXPReward": [
        [
          1,
          86
        ],
        [
          25,
          86
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          56
        ],
        [
          25,
          56
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 780,
      "power": 15,
      "magicalPower": 15,
      "prot": 25,
      "magicalProt": 25,
      "xp": 86,
      "gold": 56,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_purple",
    "uncertain": [
      "Blueprints: Inspiration Camp (Purple) · Manticore — values assumed same as Blue camp (Alpha Centaur CT)."
    ]
  },
  "camp_speed": {
    "file": "CT_Jungle_Alpha_Centaur_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          780
        ],
        [
          25,
          2580
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "MagicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "KillerXPReward": [
        [
          1,
          86
        ],
        [
          25,
          86
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          56
        ],
        [
          25,
          56
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 780,
      "power": 15,
      "magicalPower": 15,
      "prot": 25,
      "magicalProt": 25,
      "xp": 86,
      "gold": 56,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_speed",
    "uncertain": [
      "Blueprints: Pathfinder Camp (Yellow) · Satyr — values assumed same as Blue camp (Alpha Centaur CT)."
    ]
  },
  "camp_trinket": {
    "file": "CT_Jungle_Harpy_Big_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          540
        ],
        [
          25,
          1140
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          25,
          39
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          25,
          15
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          22
        ],
        [
          23,
          66
        ],
        [
          25,
          66
        ]
      ],
      "MagicalProtection": [
        [
          1,
          22
        ],
        [
          23,
          66
        ],
        [
          25,
          66
        ]
      ],
      "KillerXPReward": [
        [
          1,
          72
        ],
        [
          25,
          72
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          28.2
        ],
        [
          25,
          28.2
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 540,
      "power": 15,
      "magicalPower": 15,
      "prot": 22,
      "magicalProt": 22,
      "xp": 72,
      "gold": 28.2,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_trinket",
    "uncertain": [
      "Blueprints: Trinket camp · Harpy family."
    ]
  },
  "camp_cyclops": {
    "file": "CT_Jungle_Cyclops_Warrior_Big_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          600
        ],
        [
          25,
          2400
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          21,
          55
        ],
        [
          22,
          57
        ],
        [
          23,
          58
        ],
        [
          24,
          60
        ],
        [
          25,
          61
        ]
      ],
      "MagicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          21,
          55
        ],
        [
          22,
          57
        ],
        [
          23,
          58
        ],
        [
          24,
          60
        ],
        [
          25,
          61
        ]
      ],
      "KillerXPReward": [
        [
          1,
          72
        ],
        [
          25,
          72
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          40
        ],
        [
          25,
          40
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 600,
      "power": 15,
      "magicalPower": 15,
      "prot": 25,
      "magicalProt": 25,
      "xp": 72,
      "gold": 40,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_cyclops",
    "uncertain": []
  },
  "camp_scorpion": {
    "file": "CT_Jungle_Scorpion_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          1000
        ],
        [
          25,
          3040
        ]
      ],
      "PhysicalPower": [
        [
          1,
          45
        ],
        [
          2,
          47
        ],
        [
          3,
          48
        ],
        [
          4,
          50
        ],
        [
          5,
          51
        ],
        [
          6,
          53
        ],
        [
          7,
          54
        ],
        [
          8,
          56
        ],
        [
          9,
          57
        ],
        [
          10,
          59
        ],
        [
          11,
          60
        ],
        [
          12,
          62
        ],
        [
          13,
          63
        ],
        [
          14,
          65
        ],
        [
          15,
          66
        ],
        [
          16,
          68
        ],
        [
          17,
          69
        ],
        [
          18,
          71
        ],
        [
          19,
          72
        ],
        [
          20,
          74
        ],
        [
          21,
          75
        ],
        [
          22,
          77
        ],
        [
          23,
          78
        ],
        [
          24,
          80
        ],
        [
          25,
          81
        ]
      ],
      "MagicalPower": [
        [
          1,
          45
        ],
        [
          2,
          47
        ],
        [
          3,
          48
        ],
        [
          4,
          50
        ],
        [
          5,
          51
        ],
        [
          6,
          53
        ],
        [
          7,
          54
        ],
        [
          8,
          56
        ],
        [
          9,
          57
        ],
        [
          10,
          59
        ],
        [
          11,
          60
        ],
        [
          12,
          62
        ],
        [
          13,
          63
        ],
        [
          14,
          65
        ],
        [
          15,
          66
        ],
        [
          16,
          68
        ],
        [
          17,
          69
        ],
        [
          18,
          71
        ],
        [
          19,
          72
        ],
        [
          20,
          74
        ],
        [
          21,
          75
        ],
        [
          22,
          77
        ],
        [
          23,
          78
        ],
        [
          24,
          80
        ],
        [
          25,
          81
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          30
        ],
        [
          20,
          68
        ],
        [
          25,
          68
        ]
      ],
      "MagicalProtection": [
        [
          1,
          30
        ],
        [
          20,
          68
        ],
        [
          25,
          68
        ]
      ],
      "KillerXPReward": [
        [
          1,
          158
        ],
        [
          25,
          158
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          96
        ],
        [
          25,
          96
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 1000,
      "power": 45,
      "magicalPower": 45,
      "prot": 30,
      "magicalProt": 30,
      "xp": 158,
      "gold": 96,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_scorpion",
    "uncertain": [
      "Blueprints: Scorpion camp · CT_Jungle_Scorpion_Stats."
    ]
  },
  "camp_rogues": {
    "file": "CT_Jungle_Cyclops_Big_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          520
        ],
        [
          25,
          1360
        ]
      ],
      "PhysicalPower": [
        [
          1,
          12
        ],
        [
          25,
          48
        ]
      ],
      "MagicalPower": [
        [
          1,
          12
        ],
        [
          25,
          48
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          18
        ],
        [
          6,
          33
        ],
        [
          25,
          33
        ]
      ],
      "MagicalProtection": [
        [
          1,
          18
        ],
        [
          6,
          33
        ],
        [
          25,
          33
        ]
      ],
      "KillerXPReward": [
        [
          1,
          30
        ],
        [
          25,
          30
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          32
        ],
        [
          25,
          32
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 520,
      "power": 12,
      "magicalPower": 12,
      "prot": 18,
      "magicalProt": 18,
      "xp": 30,
      "gold": 32,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_rogues",
    "uncertain": []
  },
  "camp_random": {
    "file": "CT_Jungle_Alpha_Chimera_F2P_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          780
        ],
        [
          25,
          2580
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "MagicalProtection": [
        [
          1,
          25
        ],
        [
          2,
          27
        ],
        [
          3,
          28
        ],
        [
          4,
          30
        ],
        [
          5,
          31
        ],
        [
          6,
          33
        ],
        [
          7,
          34
        ],
        [
          8,
          36
        ],
        [
          9,
          37
        ],
        [
          10,
          39
        ],
        [
          11,
          40
        ],
        [
          12,
          42
        ],
        [
          13,
          43
        ],
        [
          14,
          45
        ],
        [
          15,
          46
        ],
        [
          16,
          48
        ],
        [
          17,
          49
        ],
        [
          18,
          51
        ],
        [
          19,
          52
        ],
        [
          20,
          54
        ],
        [
          25,
          54
        ]
      ],
      "KillerXPReward": [
        [
          1,
          86
        ],
        [
          25,
          86
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          56
        ],
        [
          25,
          56
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 780,
      "power": 15,
      "magicalPower": 15,
      "prot": 25,
      "magicalProt": 25,
      "xp": 86,
      "gold": 56,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "camp_random",
    "uncertain": [
      "Blueprints: rotating buff — Alpha Chimera stats as placeholder."
    ]
  },
  "oracle": {
    "file": "CT_Jungle_Oracle_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          620
        ],
        [
          25,
          2540
        ]
      ],
      "PhysicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "MagicalPower": [
        [
          1,
          15
        ],
        [
          2,
          17
        ],
        [
          3,
          18
        ],
        [
          4,
          20
        ],
        [
          5,
          21
        ],
        [
          6,
          23
        ],
        [
          7,
          24
        ],
        [
          8,
          26
        ],
        [
          9,
          27
        ],
        [
          10,
          29
        ],
        [
          11,
          30
        ],
        [
          12,
          32
        ],
        [
          13,
          33
        ],
        [
          14,
          35
        ],
        [
          15,
          36
        ],
        [
          16,
          38
        ],
        [
          17,
          39
        ],
        [
          18,
          41
        ],
        [
          19,
          42
        ],
        [
          20,
          44
        ],
        [
          21,
          45
        ],
        [
          22,
          47
        ],
        [
          23,
          48
        ],
        [
          24,
          50
        ],
        [
          25,
          51
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          26
        ],
        [
          19,
          80
        ],
        [
          25,
          80
        ]
      ],
      "MagicalProtection": [
        [
          1,
          26
        ],
        [
          19,
          80
        ],
        [
          25,
          80
        ]
      ],
      "KillerXPReward": [
        [
          1,
          86
        ],
        [
          25,
          86
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          56
        ],
        [
          25,
          56
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ]
    },
    "base": {
      "hp": 620,
      "power": 15,
      "magicalPower": 15,
      "prot": 26,
      "magicalProt": 26,
      "xp": 86,
      "gold": 56,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "camp_reward",
    "blueprintRef": "oracle",
    "uncertain": []
  },
  "pyromancer": {
    "file": "CT_Jungle_Pyromancer_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          2250
        ],
        [
          2,
          2610
        ],
        [
          3,
          2980
        ],
        [
          4,
          3360
        ],
        [
          5,
          3750
        ],
        [
          6,
          4150
        ],
        [
          7,
          4560
        ],
        [
          8,
          4980
        ],
        [
          9,
          5410
        ],
        [
          10,
          5850
        ],
        [
          11,
          6300
        ],
        [
          12,
          6760
        ],
        [
          13,
          7230
        ],
        [
          14,
          7710
        ],
        [
          15,
          8200
        ],
        [
          16,
          8700
        ],
        [
          17,
          9210
        ],
        [
          18,
          9730
        ],
        [
          19,
          10260
        ],
        [
          20,
          10800
        ],
        [
          21,
          11350
        ],
        [
          22,
          11910
        ],
        [
          23,
          12480
        ],
        [
          24,
          13060
        ],
        [
          25,
          13650
        ]
      ],
      "PhysicalPower": [
        [
          1,
          35
        ],
        [
          25,
          107
        ]
      ],
      "MagicalPower": [
        [
          1,
          35
        ],
        [
          25,
          107
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          27
        ],
        [
          25,
          99
        ]
      ],
      "MagicalProtection": [
        [
          1,
          27
        ],
        [
          25,
          99
        ]
      ],
      "KillerXPReward": [
        [
          1,
          150
        ],
        [
          25,
          150
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          250
        ],
        [
          25,
          250
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          25,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          50
        ],
        [
          25,
          50
        ]
      ]
    },
    "base": {
      "hp": 2250,
      "power": 35,
      "magicalPower": 35,
      "prot": 27,
      "magicalProt": 27,
      "xp": 150,
      "gold": 250,
      "teamXp": 0,
      "teamGold": 50
    },
    "scaling": "camp_reward",
    "blueprintRef": "pyromancer",
    "uncertain": []
  },
  "gold_fury": {
    "file": "CT_Jungle_GoldFury_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          2750
        ],
        [
          2,
          3060
        ],
        [
          3,
          3380
        ],
        [
          4,
          3710
        ],
        [
          5,
          4050
        ],
        [
          6,
          4400
        ],
        [
          7,
          4760
        ],
        [
          8,
          5130
        ],
        [
          9,
          5510
        ],
        [
          10,
          5900
        ],
        [
          11,
          6300
        ],
        [
          12,
          6710
        ],
        [
          13,
          7130
        ],
        [
          14,
          7560
        ],
        [
          15,
          8000
        ],
        [
          16,
          8450
        ],
        [
          17,
          8910
        ],
        [
          18,
          9380
        ],
        [
          19,
          9860
        ],
        [
          20,
          10350
        ],
        [
          21,
          10850
        ],
        [
          22,
          11360
        ],
        [
          23,
          11880
        ],
        [
          24,
          12410
        ],
        [
          25,
          12950
        ],
        [
          26,
          13500
        ],
        [
          27,
          14060
        ],
        [
          28,
          14630
        ],
        [
          29,
          15210
        ],
        [
          30,
          15800
        ],
        [
          31,
          16000
        ],
        [
          40,
          16000
        ]
      ],
      "PhysicalPower": [
        [
          1,
          30
        ],
        [
          40,
          108
        ]
      ],
      "MagicalPower": [
        [
          1,
          30
        ],
        [
          40,
          108
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          30
        ],
        [
          40,
          147
        ]
      ],
      "MagicalProtection": [
        [
          1,
          30
        ],
        [
          40,
          147
        ]
      ],
      "KillerXPReward": [
        [
          1,
          0
        ],
        [
          40,
          0
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ],
        [
          40,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          60
        ],
        [
          40,
          255
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          156
        ],
        [
          40,
          390
        ]
      ]
    },
    "base": {
      "hp": 2750,
      "power": 30,
      "magicalPower": 30,
      "prot": 30,
      "magicalProt": 30,
      "xp": 0,
      "gold": 0,
      "teamXp": 60,
      "teamGold": 156
    },
    "scaling": "boss_curve",
    "blueprintRef": "gold_fury",
    "uncertain": []
  },
  "fire_giant": {
    "file": "CT_Jungle_FireGiant_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          6200
        ],
        [
          2,
          6510
        ],
        [
          3,
          6830
        ],
        [
          4,
          7160
        ],
        [
          5,
          7500
        ],
        [
          6,
          7850
        ],
        [
          7,
          8210
        ],
        [
          8,
          8580
        ],
        [
          9,
          8960
        ],
        [
          10,
          9350
        ],
        [
          11,
          9750
        ],
        [
          12,
          10160
        ],
        [
          13,
          10580
        ],
        [
          14,
          11010
        ],
        [
          15,
          11450
        ],
        [
          16,
          11900
        ],
        [
          17,
          12360
        ],
        [
          18,
          12830
        ],
        [
          19,
          13310
        ],
        [
          20,
          13800
        ],
        [
          21,
          14300
        ],
        [
          22,
          14810
        ],
        [
          23,
          15330
        ],
        [
          24,
          15860
        ],
        [
          25,
          16400
        ],
        [
          26,
          16950
        ],
        [
          27,
          17510
        ],
        [
          28,
          18080
        ],
        [
          29,
          18660
        ],
        [
          30,
          19250
        ],
        [
          31,
          19850
        ],
        [
          32,
          20000
        ],
        [
          40,
          20000
        ]
      ],
      "PhysicalPower": [
        [
          1,
          120
        ],
        [
          40,
          237
        ]
      ],
      "MagicalPower": [
        [
          1,
          60
        ],
        [
          40,
          177
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          48
        ],
        [
          32,
          172
        ],
        [
          33,
          175
        ],
        [
          40,
          175
        ]
      ],
      "MagicalProtection": [
        [
          1,
          48
        ],
        [
          32,
          172
        ],
        [
          33,
          175
        ],
        [
          40,
          175
        ]
      ],
      "KillerXPReward": [
        [
          1,
          0
        ],
        [
          40,
          0
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ],
        [
          40,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          200
        ],
        [
          40,
          395
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          180
        ],
        [
          40,
          414
        ]
      ]
    },
    "base": {
      "hp": 6200,
      "power": 120,
      "magicalPower": 60,
      "prot": 48,
      "magicalProt": 48,
      "xp": 0,
      "gold": 0,
      "teamXp": 200,
      "teamGold": 180
    },
    "scaling": "boss_curve",
    "blueprintRef": "fire_giant",
    "uncertain": []
  },
  "totem": {
    "file": "CT_Totem.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          600
        ]
      ],
      "PhysicalPower": [
        [
          1,
          0
        ]
      ],
      "MagicalPower": [
        [
          1,
          0
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          0
        ]
      ],
      "MagicalProtection": [
        [
          1,
          0
        ]
      ],
      "KillerXPReward": [
        [
          1,
          0
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          0
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          0
        ]
      ]
    },
    "base": {
      "hp": 600,
      "power": 0,
      "magicalPower": 0,
      "prot": 0,
      "magicalProt": 0,
      "xp": 0,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "static",
    "blueprintRef": "totem",
    "uncertain": []
  },
  "moonlight_queen": {
    "file": "CT_Jungle_Naga_Moonlight_Stats.json",
    "curves": {
      "MaxHealth": [
        [
          1,
          3000
        ],
        [
          27,
          12750
        ],
        [
          28,
          13000
        ],
        [
          40,
          13000
        ]
      ],
      "PhysicalPower": [
        [
          1,
          40
        ],
        [
          40,
          196
        ]
      ],
      "MagicalPower": [
        [
          1,
          40
        ],
        [
          40,
          196
        ]
      ],
      "PhysicalProtection": [
        [
          1,
          30
        ],
        [
          37,
          138
        ],
        [
          38,
          140
        ],
        [
          40,
          140
        ]
      ],
      "MagicalProtection": [
        [
          1,
          30
        ],
        [
          37,
          138
        ],
        [
          38,
          140
        ],
        [
          40,
          140
        ]
      ],
      "KillerXPReward": [
        [
          1,
          200
        ],
        [
          40,
          200
        ]
      ],
      "KillerGoldReward": [
        [
          1,
          250
        ],
        [
          40,
          250
        ]
      ],
      "TeamXPReward": [
        [
          1,
          0
        ],
        [
          40,
          0
        ]
      ],
      "TeamGoldReward": [
        [
          1,
          50
        ],
        [
          40,
          50
        ]
      ]
    },
    "base": {
      "hp": 3000,
      "power": 40,
      "magicalPower": 40,
      "prot": 30,
      "magicalProt": 30,
      "xp": 200,
      "gold": 250,
      "teamXp": 0,
      "teamGold": 50
    },
    "scaling": "camp_reward",
    "blueprintRef": "moonlight_queen",
    "uncertain": []
  },
  "camp_gold": {
    "file": "Blueprint:camp_gold",
    "curves": {},
    "base": {
      "hp": 0,
      "power": 0,
      "magicalPower": 0,
      "prot": 0,
      "magicalProt": 0,
      "xp": 0,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "objective",
    "blueprintRef": "camp_gold",
    "uncertain": [
      "Blueprints: The Heliokrater pickup (GoldPickupV2) — not a combat jungle camp."
    ]
  },
  "ritual_site": {
    "file": "Blueprint:ritual_site",
    "curves": {},
    "base": {
      "hp": 0,
      "power": 0,
      "magicalPower": 0,
      "prot": 0,
      "magicalProt": 0,
      "xp": 0,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "objective",
    "blueprintRef": "ritual_site",
    "uncertain": [
      "Blueprints: Moonlight capture point — not a combat jungle camp."
    ]
  },
  "crystal": {
    "file": "Blueprint:crystal",
    "curves": {},
    "base": {
      "hp": 0,
      "power": 0,
      "magicalPower": 0,
      "prot": 0,
      "magicalProt": 0,
      "xp": 0,
      "gold": 0,
      "teamXp": 0,
      "teamGold": 0
    },
    "scaling": "objective",
    "blueprintRef": "crystal",
    "uncertain": [
      "Blueprints: Moonlight shard pickup — not a combat jungle camp."
    ]
  }
};

export function getConquestStatsKeyForPoi(poiId) {
  return CONQUEST_POI_STATS_KEY[poiId] || null;
}

export function getConquestNpcProfile(poiId) {
  const key = getConquestStatsKeyForPoi(poiId);
  return key ? CONQUEST_NPC_PROFILES[key] : null;
}
