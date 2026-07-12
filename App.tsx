import React, { useEffect, useRef, useState } from 'react';
import {
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

type GameStatus = 'menu' | 'playing' | 'levelComplete' | 'gameOver';

type Rectangle = {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

type IceCream = {
  id: number;
  x: number;
  y: number;
  collected: boolean;
  kidId: number;
};

type Kid = {
  id: number;
  x: number;
  y: number;
  speed: number;
  activeAt: number | null;
  chaseEndsAt: number | null;
  chasing: boolean;
  hidden: boolean;
  shirtColour: string;
  zigzagPhase: number;
};

const WORLD_WIDTH = 9000;
const WORLD_HEIGHT = 6000;
const PLAYER_SIZE = 58;

const POND: Rectangle = {
  id: 1,
  x: 2150,
  y: 950,
  width: 950,
  height: 620,
};

const BUSHES: Rectangle[] = [
  { id: 1, x: 620, y: 1080, width: 180, height: 125 },
  { id: 2, x: 1180, y: 1480, width: 190, height: 130 },
  { id: 3, x: 1760, y: 420, width: 185, height: 125 },
  { id: 4, x: 3380, y: 760, width: 200, height: 135 },
  { id: 5, x: 4010, y: 1360, width: 190, height: 130 },
  { id: 6, x: 4780, y: 590, width: 185, height: 125 },
  { id: 7, x: 5460, y: 1710, width: 205, height: 140 },
  { id: 8, x: 6290, y: 870, width: 190, height: 130 },
  { id: 9, x: 7200, y: 1430, width: 195, height: 135 },
  { id: 10, x: 8080, y: 650, width: 190, height: 130 },
  { id: 11, x: 900, y: 2850, width: 210, height: 140 },
  { id: 12, x: 1820, y: 3530, width: 190, height: 130 },
  { id: 13, x: 2860, y: 2640, width: 200, height: 135 },
  { id: 14, x: 3790, y: 3820, width: 190, height: 130 },
  { id: 15, x: 4680, y: 2950, width: 210, height: 140 },
  { id: 16, x: 5600, y: 4060, width: 195, height: 135 },
  { id: 17, x: 6580, y: 3060, width: 200, height: 135 },
  { id: 18, x: 7520, y: 4310, width: 200, height: 135 },
  { id: 19, x: 8250, y: 3120, width: 190, height: 130 },
  { id: 20, x: 4250, y: 5220, width: 210, height: 140 },
];

const TUNNELS: Rectangle[] = [
  { id: 1, x: 1450, y: 2280, width: 230, height: 145 },
  { id: 2, x: 3600, y: 2100, width: 230, height: 145 },
  { id: 3, x: 5940, y: 2460, width: 230, height: 145 },
  { id: 4, x: 7580, y: 1980, width: 230, height: 145 },
];

const FENCES: Rectangle[] = [
  { id: 1, x: 700, y: 1780, width: 900, height: 45 },
  { id: 2, x: 1600, y: 1780, width: 45, height: 620 },
  { id: 3, x: 3250, y: 310, width: 45, height: 780 },
  { id: 4, x: 5200, y: 1150, width: 1100, height: 45 },
  { id: 5, x: 6300, y: 1150, width: 45, height: 730 },
  { id: 6, x: 910, y: 4250, width: 1300, height: 45 },
  { id: 7, x: 4900, y: 4550, width: 45, height: 900 },
  { id: 8, x: 7000, y: 4780, width: 1200, height: 45 },
];

const WALLS: Rectangle[] = [
  { id: 1, x: 2660, y: 2050, width: 720, height: 95 },
  { id: 2, x: 4430, y: 2450, width: 100, height: 720 },
  { id: 3, x: 6500, y: 3520, width: 900, height: 100 },
  { id: 4, x: 2430, y: 4850, width: 950, height: 100 },
];

const PLAYGROUND_ITEMS: Rectangle[] = [
  { id: 1, x: 980, y: 2450, width: 260, height: 240 },
  { id: 2, x: 1820, y: 2380, width: 300, height: 250 },
  { id: 3, x: 3480, y: 2950, width: 300, height: 260 },
  { id: 4, x: 5380, y: 3420, width: 310, height: 250 },
  { id: 5, x: 7350, y: 2750, width: 290, height: 250 },
  { id: 6, x: 7900, y: 3900, width: 310, height: 250 },
];

const SOLID_OBJECTS: Rectangle[] = [
  POND,
  ...FENCES,
  ...WALLS,
  ...PLAYGROUND_ITEMS,
];

const HIDING_ZONES: Rectangle[] = [...BUSHES, ...TUNNELS];

const clamp = (
  value: number,
  minimum: number,
  maximum: number,
) => Math.max(minimum, Math.min(value, maximum));

const distanceBetween = (
  firstX: number,
  firstY: number,
  secondX: number,
  secondY: number,
) => Math.hypot(firstX - secondX, firstY - secondY);

const rectanglesOverlap = (
  x: number,
  y: number,
  width: number,
  height: number,
  rectangle: Rectangle,
) =>
  x < rectangle.x + rectangle.width &&
  x + width > rectangle.x &&
  y < rectangle.y + rectangle.height &&
  y + height > rectangle.y;

const isBlocked = (
  x: number,
  y: number,
  size: number,
) =>
  SOLID_OBJECTS.some(rectangle =>
    rectanglesOverlap(x, y, size, size * 0.65, rectangle),
  );

const isInsideZone = (
  x: number,
  y: number,
  zone: Rectangle,
) =>
  x >= zone.x &&
  x <= zone.x + zone.width &&
  y >= zone.y &&
  y <= zone.y + zone.height;

const isSafePickupPosition = (
  x: number,
  y: number,
) =>
  !SOLID_OBJECTS.some(rectangle =>
    rectanglesOverlap(x - 80, y - 80, 180, 180, rectangle),
  );

const createPickupPosition = (
  index: number,
): { x: number; y: number } => {
  const usableWidth = WORLD_WIDTH - 1400;
  const usableHeight = WORLD_HEIGHT - 1200;

  let x = 650 + ((index * 1193) % usableWidth);
  let y = 620 + ((index * 857) % usableHeight);

  for (let attempt = 0; attempt < 24; attempt += 1) {
    if (isSafePickupPosition(x, y)) {
      return { x, y };
    }

    x = 600 + ((x + 570) % usableWidth);
    y = 560 + ((y + 430) % usableHeight);
  }

  return {
    x: 500 + index * 260,
    y: 500,
  };
};

export default function App() {
  const { width, height } = useWindowDimensions();

  const [status, setStatus] = useState<GameStatus>('menu');
  const [level, setLevel] = useState(1);
  const [, redraw] = useState(0);

  const playerX = useRef(380);
  const playerY = useRef(380);

  const moveX = useRef(0);
  const moveY = useRef(0);

  const nudgeTimer = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const iceCreams = useRef<IceCream[]>([]);
  const kids = useRef<Kid[]>([]);

  const collectedCount = useRef(0);
  const lastFrameTime = useRef(Date.now());
  const runMessageUntil = useRef(0);
  const roundFinished = useRef(false);

  const target = 20 + (level - 1) * 5;

  useEffect(() => {
    ScreenOrientation.lockAsync(
      ScreenOrientation.OrientationLock.LANDSCAPE,
    ).catch(() => {
      // The device may already be in landscape.
    });
  }, []);

  const nudgeMovement = (
    axis: 'x' | 'y',
    direction: -1 | 1,
  ) => {
    if (nudgeTimer.current !== null) {
      clearTimeout(nudgeTimer.current);
    }

    if (axis === 'x') {
      moveX.current = direction;
    } else {
      moveY.current = direction;
    }

    nudgeTimer.current = setTimeout(() => {
      if (
        axis === 'x' &&
        moveX.current === direction
      ) {
        moveX.current = 0;
      }

      if (
        axis === 'y' &&
        moveY.current === direction
      ) {
        moveY.current = 0;
      }

      nudgeTimer.current = null;
    }, 240);
  };

  const createLevel = (newLevel: number) => {
    const newTarget = 20 + (newLevel - 1) * 5;

    setLevel(newLevel);

    playerX.current = 380;
    playerY.current = 380;

    moveX.current = 0;
    moveY.current = 0;

    collectedCount.current = 0;
    roundFinished.current = false;
    runMessageUntil.current = 0;

    const shirtColours = [
      '#F15B5B',
      '#4689E8',
      '#F4C542',
      '#A468D8',
      '#EF8C3B',
      '#3FAE78',
      '#E657A8',
      '#57BFC7',
    ];

    iceCreams.current = Array.from(
      { length: newTarget },
      (_, index) => {
        const position = createPickupPosition(index);

        return {
          id: index,
          x: position.x,
          y: position.y,
          collected: false,
          kidId: index,
        };
      },
    );

    kids.current = iceCreams.current.map(
      (iceCream, index) => ({
        id: index,
        x: iceCream.x + 110,
        y: iceCream.y + 35,
        speed:
          115 +
          (index % 3) * 28 +
          (newLevel - 1) * 7,
        activeAt: null,
        chaseEndsAt: null,
        chasing: false,
        hidden: false,
        shirtColour:
          shirtColours[index % shirtColours.length],
        zigzagPhase: index * 1.47,
      }),
    );

    lastFrameTime.current = Date.now();

    setStatus('playing');
    redraw(value => value + 1);
  };

  useEffect(() => {
    if (status !== 'playing') {
      return;
    }

    const timer = setInterval(() => {
      const now = Date.now();

      const deltaTime = Math.min(
        (now - lastFrameTime.current) / 1000,
        0.05,
      );

      lastFrameTime.current = now;

      let directionX = moveX.current;
      let directionY = moveY.current;

      const directionLength = Math.hypot(
        directionX,
        directionY,
      );

      if (directionLength > 1) {
        directionX /= directionLength;
        directionY /= directionLength;
      }

      const movementSpeed = 410;

      const nextPlayerX = clamp(
        playerX.current +
          directionX * movementSpeed * deltaTime,
        20,
        WORLD_WIDTH - PLAYER_SIZE,
      );

      const nextPlayerY = clamp(
        playerY.current +
          directionY * movementSpeed * deltaTime,
        20,
        WORLD_HEIGHT - PLAYER_SIZE,
      );

      if (
        !isBlocked(
          nextPlayerX,
          playerY.current,
          PLAYER_SIZE,
        )
      ) {
        playerX.current = nextPlayerX;
      }

      if (
        !isBlocked(
          playerX.current,
          nextPlayerY,
          PLAYER_SIZE,
        )
      ) {
        playerY.current = nextPlayerY;
      }

      const playerCentreX =
        playerX.current + PLAYER_SIZE / 2;

      const playerCentreY =
        playerY.current + PLAYER_SIZE / 2;

      const playerIsHidden = HIDING_ZONES.some(zone =>
        isInsideZone(
          playerCentreX,
          playerCentreY,
          zone,
        ),
      );

      for (const iceCream of iceCreams.current) {
        const touchingIceCream =
          !iceCream.collected &&
          distanceBetween(
            playerCentreX,
            playerCentreY,
            iceCream.x,
            iceCream.y,
          ) < 70;

        if (touchingIceCream) {
          iceCream.collected = true;
          collectedCount.current += 1;

          const kid = kids.current.find(
            item => item.id === iceCream.kidId,
          );

          if (kid && !kid.hidden) {
            kid.activeAt = now + 5000;
            kid.chaseEndsAt = null;
            kid.chasing = false;
          }
        }
      }

      for (const kid of kids.current) {
        if (kid.hidden) {
          continue;
        }

        if (
          kid.activeAt !== null &&
          !kid.chasing &&
          now >= kid.activeAt
        ) {
          kid.chasing = true;
          kid.chaseEndsAt = now + 180000;
          runMessageUntil.current = now + 900;
        }

        if (
          kid.chasing &&
          kid.chaseEndsAt !== null &&
          now >= kid.chaseEndsAt
        ) {
          kid.hidden = true;
          kid.chasing = false;
          kid.activeAt = null;
          kid.chaseEndsAt = null;
          continue;
        }

        if (!kid.chasing || playerIsHidden) {
          continue;
        }

        const differenceX = playerCentreX - kid.x;
        const differenceY = playerCentreY - kid.y;

        const distance = Math.max(
          1,
          Math.hypot(differenceX, differenceY),
        );

        const directionToPlayerX =
          differenceX / distance;

        const directionToPlayerY =
          differenceY / distance;

        const speedWave =
          0.72 +
          ((Math.sin(
            now / 480 + kid.zigzagPhase,
          ) + 1) /
            2) *
            0.62;

        const zigzag =
          Math.sin(
            now / 210 + kid.zigzagPhase,
          ) * 58;

        const chaseX =
          directionToPlayerX * kid.speed * speedWave +
          -directionToPlayerY * zigzag;

        const chaseY =
          directionToPlayerY * kid.speed * speedWave +
          directionToPlayerX * zigzag;

        const nextKidX = clamp(
          kid.x + chaseX * deltaTime,
          10,
          WORLD_WIDTH - 48,
        );

        const nextKidY = clamp(
          kid.y + chaseY * deltaTime,
          10,
          WORLD_HEIGHT - 70,
        );

        let moved = false;

        if (!isBlocked(nextKidX, kid.y, 40)) {
          kid.x = nextKidX;
          moved = true;
        }

        if (!isBlocked(kid.x, nextKidY, 40)) {
          kid.y = nextKidY;
          moved = true;
        }

        if (!moved) {
          const sideStep =
            Math.sin(
              now / 160 + kid.zigzagPhase,
            ) > 0
              ? 1
              : -1;

          const sideX =
            kid.x +
            -directionToPlayerY *
              sideStep *
              kid.speed *
              deltaTime;

          const sideY =
            kid.y +
            directionToPlayerX *
              sideStep *
              kid.speed *
              deltaTime;

          if (!isBlocked(sideX, kid.y, 40)) {
            kid.x = sideX;
          }

          if (!isBlocked(kid.x, sideY, 40)) {
            kid.y = sideY;
          }
        }

        const caughtPlayer =
          distanceBetween(
            playerCentreX,
            playerCentreY,
            kid.x,
            kid.y,
          ) < 50;

        if (
          caughtPlayer &&
          !roundFinished.current
        ) {
          roundFinished.current = true;

          moveX.current = 0;
          moveY.current = 0;

          setStatus('gameOver');

          setTimeout(() => {
            setStatus('menu');
          }, 1900);

          return;
        }
      }

      if (
        collectedCount.current >= target &&
        !roundFinished.current
      ) {
        roundFinished.current = true;

        moveX.current = 0;
        moveY.current = 0;

        setStatus('levelComplete');
        return;
      }

      redraw(value => value + 1);
    }, 30);

    return () => clearInterval(timer);
  }, [status, target]);

  if (status === 'menu') {
    return (
      <SafeAreaView style={styles.menuScreen}>
        <StatusBar hidden />

        <View style={styles.menuSun} />
        <View style={styles.menuGrass} />
        <View style={styles.menuPath} />

        <View style={styles.titleCard}>
          <Text style={styles.smallTitle}>
            THE ADVENTURES OF
          </Text>

          <Text style={styles.mainTitle}>
            ISHOWZORO
          </Text>

          <Text style={styles.secondTitle}>
            ESCAPES KIDS
          </Text>

          <Text style={styles.titleIceCream}>
            🍦
          </Text>

          <Text style={styles.menuInfo}>
            Mega Park • 20 Ice Creams
          </Text>
        </View>

        <TouchableOpacity
          style={styles.playButton}
          onPress={() => createLevel(1)}
          activeOpacity={0.8}
        >
          <Text style={styles.playButtonText}>
            PLAY
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (status === 'gameOver') {
    return (
      <SafeAreaView style={styles.gameOverScreen}>
        <StatusBar hidden />

        <Text style={styles.gameOverTitle}>
          GAME OVER
        </Text>

        <Text style={styles.gameOverMessage}>
          IShowZoro was tagged!
        </Text>

        <Text style={styles.returnMessage}>
          Returning to the start screen…
        </Text>
      </SafeAreaView>
    );
  }

  if (status === 'levelComplete') {
    const nextTarget = 20 + level * 5;

    return (
      <SafeAreaView style={styles.completeScreen}>
        <StatusBar hidden />

        <Text style={styles.completeTitle}>
          LEVEL COMPLETE!
        </Text>

        <Text style={styles.completeIceCream}>
          🍦
        </Text>

        <Text style={styles.completeMessage}>
          You collected {target} ice creams!
        </Text>

        <Text style={styles.nextMessage}>
          Next level: {nextTarget} ice creams
        </Text>

        <TouchableOpacity
          style={styles.nextButton}
          onPress={() => createLevel(level + 1)}
          activeOpacity={0.8}
        >
          <Text style={styles.nextButtonText}>
            NEXT LEVEL
          </Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const cameraX = clamp(
    playerX.current - width / 2,
    0,
    Math.max(0, WORLD_WIDTH - width),
  );

  const cameraY = clamp(
    playerY.current - height / 2,
    0,
    Math.max(0, WORLD_HEIGHT - height),
  );

  const playerCentreX =
    playerX.current + PLAYER_SIZE / 2;

  const playerCentreY =
    playerY.current + PLAYER_SIZE / 2;

  const playerIsHidden = HIDING_ZONES.some(zone =>
    isInsideZone(
      playerCentreX,
      playerCentreY,
      zone,
    ),
  );

  const waitingKids = kids.current
    .filter(
      kid =>
        kid.activeAt !== null &&
        !kid.chasing &&
        !kid.hidden,
    )
    .sort(
      (first, second) =>
        (first.activeAt ?? 0) -
        (second.activeAt ?? 0),
    );

  let countdownMessage = '';

  if (
    waitingKids.length > 0 &&
    waitingKids[0].activeAt !== null
  ) {
    countdownMessage = String(
      Math.max(
        1,
        Math.ceil(
          (waitingKids[0].activeAt - Date.now()) /
            1000,
        ),
      ),
    );
  } else if (Date.now() < runMessageUntil.current) {
    countdownMessage = 'RUN!';
  }

  const trees = Array.from(
    { length: 95 },
    (_, index) => ({
      id: index,
      x: 180 + ((index * 743) % 8500),
      y: 180 + ((index * 521) % 5500),
    }),
  ).filter(
    tree =>
      !SOLID_OBJECTS.some(rectangle =>
        rectanglesOverlap(
          tree.x,
          tree.y,
          120,
          120,
          rectangle,
        ),
      ),
  );

  return (
    <SafeAreaView style={styles.gameScreen}>
      <StatusBar hidden />

      <View style={styles.hud}>
        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>
            LEVEL
          </Text>

          <Text style={styles.hudNumber}>
            {level}
          </Text>
        </View>

        <View style={styles.hudBox}>
          <Text style={styles.hudLabel}>
            ICE CREAMS
          </Text>

          <Text style={styles.hudNumber}>
            {collectedCount.current}/{target}
          </Text>
        </View>
      </View>

      <View style={styles.parkWindow}>
        <View
          style={[
            styles.world,
            {
              width: WORLD_WIDTH,
              height: WORLD_HEIGHT,
              transform: [
                { translateX: -cameraX },
                { translateY: -cameraY },
              ],
            },
          ]}
        >
          <View
            style={[
              styles.horizontalPath,
              {
                top: 540,
                width: WORLD_WIDTH,
              },
            ]}
          />

          <View
            style={[
              styles.horizontalPath,
              {
                top: 3320,
                width: WORLD_WIDTH,
              },
            ]}
          />

          <View
            style={[
              styles.verticalPath,
              {
                left: 3850,
                height: WORLD_HEIGHT,
              },
            ]}
          />

          <View style={styles.pond}>
            <View style={styles.pondShineOne} />
            <View style={styles.pondShineTwo} />

            <Text style={styles.ducks}>
              🦆　🦆
            </Text>
          </View>

          {trees.map(tree => (
            <View
              key={`tree-${tree.id}`}
              style={[
                styles.tree,
                {
                  left: tree.x,
                  top: tree.y,
                  zIndex: Math.floor(tree.y),
                },
              ]}
            >
              <View style={styles.treeShadow} />
              <View style={styles.treeLeaves} />
              <View style={styles.treeTrunk} />
            </View>
          ))}

          {FENCES.map(fence => (
            <View
              key={`fence-${fence.id}`}
              style={[
                styles.fence,
                {
                  left: fence.x,
                  top: fence.y,
                  width: fence.width,
                  height: fence.height,
                  zIndex: Math.floor(fence.y),
                },
              ]}
            >
              <View style={styles.fenceHighlight} />
            </View>
          ))}

          {WALLS.map(wall => (
            <View
              key={`wall-${wall.id}`}
              style={[
                styles.wall,
                {
                  left: wall.x,
                  top: wall.y,
                  width: wall.width,
                  height: wall.height,
                  zIndex: Math.floor(wall.y),
                },
              ]}
            />
          ))}

          {PLAYGROUND_ITEMS.map(item => (
            <View
              key={`playground-${item.id}`}
              style={[
                styles.playgroundItem,
                {
                  left: item.x,
                  top: item.y,
                  width: item.width,
                  height: item.height,
                  zIndex: Math.floor(item.y),
                },
              ]}
            >
              <View style={styles.playgroundRoof} />
              <View style={styles.playgroundPlatform} />
              <View style={styles.playgroundSlide} />

              <Text style={styles.playgroundLabel}>
                PLAY
              </Text>
            </View>
          ))}

          {TUNNELS.map(tunnel => (
            <View
              key={`tunnel-${tunnel.id}`}
              style={[
                styles.tunnel,
                {
                  left: tunnel.x,
                  top: tunnel.y,
                  width: tunnel.width,
                  height: tunnel.height,
                  zIndex: Math.floor(
                    tunnel.y + tunnel.height,
                  ),
                },
              ]}
            >
              <View style={styles.tunnelOpening} />
              <Text style={styles.hideLabel}>
                HIDE
              </Text>
            </View>
          ))}

          {BUSHES.map(bush => (
            <View
              key={`bush-${bush.id}`}
              style={[
                styles.bush,
                {
                  left: bush.x,
                  top: bush.y,
                  width: bush.width,
                  height: bush.height,
                  zIndex: Math.floor(
                    bush.y + bush.height,
                  ),
                },
              ]}
            >
              <View style={styles.bushCircleOne} />
              <View style={styles.bushCircleTwo} />
              <View style={styles.bushCircleThree} />
            </View>
          ))}

          {iceCreams.current.map(iceCream =>
            iceCream.collected ? null : (
              <View
                key={`ice-${iceCream.id}`}
                style={[
                  styles.iceCreamObject,
                  {
                    left: iceCream.x,
                    top: iceCream.y,
                    zIndex: Math.floor(iceCream.y),
                  },
                ]}
              >
                <View style={styles.iceCreamShadow} />

                <Text style={styles.iceCreamEmoji}>
                  🍦
                </Text>
              </View>
            ),
          )}

          {kids.current.map(kid =>
            kid.hidden ? null : (
              <View
                key={`kid-${kid.id}`}
                style={[
                  styles.kid,
                  {
                    left: kid.x,
                    top: kid.y,
                    zIndex: Math.floor(kid.y),
                  },
                ]}
              >
                {kid.chasing && (
                  <Text style={styles.chasingMark}>
                    {playerIsHidden ? '?' : '!'}
                  </Text>
                )}

                <View style={styles.personShadow} />

                <View style={styles.kidHead}>
                  <View style={styles.kidHair} />

                  <Text style={styles.kidFace}>
                    •ᴗ•
                  </Text>
                </View>

                <View
                  style={[
                    styles.kidShirt,
                    {
                      backgroundColor:
                        kid.shirtColour,
                    },
                  ]}
                />

                <View style={styles.kidLegRow}>
                  <View style={styles.kidLeg} />
                  <View style={styles.kidLeg} />
                </View>
              </View>
            ),
          )}

          <View
            style={[
              styles.player,
              {
                left: playerX.current,
                top: playerY.current,
                zIndex: Math.floor(playerY.current),
                opacity: playerIsHidden ? 0.6 : 1,
              },
            ]}
          >
            <View style={styles.personShadow} />
            <View style={styles.playerHat} />

            <View style={styles.playerHead}>
              <Text style={styles.playerFace}>
                •‿•
              </Text>
            </View>

            <View style={styles.playerShirt}>
              <Text style={styles.playerLetter}>
                Z
              </Text>
            </View>

            <View style={styles.playerPants} />

            <View style={styles.playerShoes}>
              <View style={styles.fruitShoe}>
                <Text style={styles.shoeSwirl}>
                  ➰
                </Text>
              </View>

              <View style={styles.fruitShoe}>
                <Text style={styles.shoeSwirl}>
                  ➰
                </Text>
              </View>
            </View>
          </View>
        </View>

        {playerIsHidden && (
          <View style={styles.hiddenNotice}>
            <Text style={styles.hiddenNoticeText}>
              HIDDEN!
            </Text>
          </View>
        )}

        {countdownMessage !== '' && (
          <View style={styles.countdownCircle}>
            <Text
              style={[
                styles.countdownText,
                countdownMessage === 'RUN!' &&
                  styles.runText,
              ]}
            >
              {countdownMessage}
            </Text>
          </View>
        )}

        <View style={styles.dPad}>
          <TouchableOpacity
            style={[
              styles.moveButton,
              styles.upButton,
            ]}
            onPress={() =>
              nudgeMovement('y', -1)
            }
            onPressIn={() => {
              moveY.current = -1;
            }}
            onPressOut={() => {
              if (moveY.current === -1) {
                moveY.current = 0;
              }
            }}
          >
            <Text style={styles.moveButtonText}>
              ↑
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.moveButton,
              styles.leftButton,
            ]}
            onPress={() =>
              nudgeMovement('x', -1)
            }
            onPressIn={() => {
              moveX.current = -1;
            }}
            onPressOut={() => {
              if (moveX.current === -1) {
                moveX.current = 0;
              }
            }}
          >
            <Text style={styles.moveButtonText}>
              ←
            </Text>
          </TouchableOpacity>

          <View style={styles.dPadCentre} />

          <TouchableOpacity
            style={[
              styles.moveButton,
              styles.rightButton,
            ]}
            onPress={() =>
              nudgeMovement('x', 1)
            }
            onPressIn={() => {
              moveX.current = 1;
            }}
            onPressOut={() => {
              if (moveX.current === 1) {
                moveX.current = 0;
              }
            }}
          >
            <Text style={styles.moveButtonText}>
              →
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.moveButton,
              styles.downButton,
            ]}
            onPress={() =>
              nudgeMovement('y', 1)
            }
            onPressIn={() => {
              moveY.current = 1;
            }}
            onPressOut={() => {
              if (moveY.current === 1) {
                moveY.current = 0;
              }
            }}
          >
            <Text style={styles.moveButtonText}>
              ↓
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.mapLabel}>
          <Text style={styles.mapLabelText}>
            MEGA PARK
          </Text>

          <Text style={styles.mapLabelSmall}>
            Bushes and tunnels are hiding places
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  menuScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#BDE9FF',
  },
  menuSun: {
    position: 'absolute',
    top: 35,
    right: 70,
    width: 95,
    height: 95,
    borderRadius: 48,
    backgroundColor: '#FFD84B',
  },
  menuGrass: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    height: '43%',
    backgroundColor: '#72C954',
  },
  menuPath: {
    position: 'absolute',
    bottom: -70,
    width: '55%',
    height: '50%',
    borderRadius: 170,
    backgroundColor: '#D9BD88',
  },
  titleCard: {
    width: '58%',
    maxWidth: 620,
    alignItems: 'center',
    paddingVertical: 17,
    paddingHorizontal: 25,
    borderWidth: 5,
    borderRadius: 28,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.93)',
  },
  smallTitle: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 3,
    color: '#34769B',
  },
  mainTitle: {
    marginTop: 4,
    fontSize: 43,
    fontWeight: '900',
    color: '#E63B3B',
  },
  secondTitle: {
    fontSize: 24,
    fontWeight: '900',
    color: '#29994C',
  },
  titleIceCream: {
    marginTop: 3,
    fontSize: 38,
  },
  menuInfo: {
    marginTop: 3,
    fontSize: 14,
    fontWeight: '800',
    color: '#3C7087',
  },
  playButton: {
    width: 190,
    alignItems: 'center',
    marginTop: 15,
    paddingVertical: 12,
    borderWidth: 5,
    borderRadius: 35,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFCB35',
  },
  playButtonText: {
    fontSize: 27,
    fontWeight: '900',
    letterSpacing: 4,
    color: '#713B18',
  },
  gameScreen: {
    flex: 1,
    backgroundColor: '#67BB4D',
  },
  parkWindow: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#6FC454',
  },
  world: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: '#70C858',
  },
  horizontalPath: {
    position: 'absolute',
    left: 0,
    height: 260,
    backgroundColor: '#D3B37C',
    borderTopWidth: 10,
    borderBottomWidth: 10,
    borderColor: '#C19B61',
  },
  verticalPath: {
    position: 'absolute',
    top: 0,
    width: 270,
    backgroundColor: '#D3B37C',
    borderLeftWidth: 10,
    borderRightWidth: 10,
    borderColor: '#C19B61',
  },
  pond: {
    position: 'absolute',
    left: POND.x,
    top: POND.y,
    width: POND.width,
    height: POND.height,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 22,
    borderRadius: 260,
    borderColor: '#4C9D55',
    backgroundColor: '#55BCE4',
    zIndex: 1000,
  },
  pondShineOne: {
    position: 'absolute',
    top: 120,
    left: 120,
    width: 270,
    height: 20,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.48)',
  },
  pondShineTwo: {
    position: 'absolute',
    right: 105,
    bottom: 125,
    width: 230,
    height: 17,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  ducks: {
    fontSize: 45,
  },
  tree: {
    position: 'absolute',
    width: 115,
    height: 135,
    alignItems: 'center',
  },
  treeShadow: {
    position: 'absolute',
    bottom: 5,
    width: 100,
    height: 30,
    borderRadius: 50,
    backgroundColor: 'rgba(34,74,30,0.25)',
  },
  treeLeaves: {
    width: 108,
    height: 98,
    zIndex: 2,
    borderRadius: 54,
    borderWidth: 5,
    borderColor: '#31994A',
    backgroundColor: '#45B95B',
  },
  treeTrunk: {
    width: 28,
    height: 55,
    marginTop: -8,
    borderRadius: 8,
    backgroundColor: '#87552D',
  },
  fence: {
    position: 'absolute',
    borderWidth: 4,
    borderColor: '#71471F',
    borderRadius: 6,
    backgroundColor: '#B47A3B',
  },
  fenceHighlight: {
    width: '100%',
    height: 8,
    backgroundColor: '#D99D55',
  },
  wall: {
    position: 'absolute',
    borderWidth: 5,
    borderColor: '#737373',
    borderRadius: 8,
    backgroundColor: '#A9A9A9',
  },
  playgroundItem: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderColor: '#2368A8',
    borderRadius: 22,
    backgroundColor: '#4A9BE8',
  },
  playgroundRoof: {
    position: 'absolute',
    top: 20,
    width: '62%',
    height: 46,
    borderRadius: 12,
    backgroundColor: '#E84D4D',
  },
  playgroundPlatform: {
    width: '54%',
    height: 60,
    borderRadius: 10,
    backgroundColor: '#FFD34E',
  },
  playgroundSlide: {
    position: 'absolute',
    right: 17,
    bottom: 25,
    width: 58,
    height: 120,
    borderRadius: 25,
    backgroundColor: '#E94F85',
    transform: [{ rotate: '20deg' }],
  },
  playgroundLabel: {
    fontSize: 18,
    fontWeight: '900',
    color: '#17486F',
  },
  tunnel: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'flex-end',
    overflow: 'hidden',
    borderWidth: 8,
    borderColor: '#E3A42D',
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
    backgroundColor: '#FFD34F',
  },
  tunnelOpening: {
    width: '55%',
    height: '70%',
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    backgroundColor: '#3E3E53',
  },
  hideLabel: {
    position: 'absolute',
    top: 10,
    fontSize: 13,
    fontWeight: '900',
    color: '#7A4B00',
  },
  bush: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bushCircleOne: {
    width: '48%',
    height: '78%',
    borderRadius: 70,
    backgroundColor: '#238E43',
  },
  bushCircleTwo: {
    width: '55%',
    height: '98%',
    marginHorizontal: -30,
    borderRadius: 80,
    backgroundColor: '#2FA34D',
  },
  bushCircleThree: {
    width: '48%',
    height: '78%',
    borderRadius: 70,
    backgroundColor: '#238E43',
  },
  hud: {
    zIndex: 100,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 5,
    paddingHorizontal: 14,
    backgroundColor: '#E9F8FF',
  },
  hudBox: {
    minWidth: 125,
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 15,
    borderRadius: 13,
    backgroundColor: '#FFFFFF',
  },
  hudLabel: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#447489',
  },
  hudNumber: {
    fontSize: 19,
    fontWeight: '900',
    color: '#E33C3C',
  },
  iceCreamObject: {
    position: 'absolute',
    width: 58,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iceCreamShadow: {
    position: 'absolute',
    bottom: 0,
    width: 46,
    height: 15,
    borderRadius: 25,
    backgroundColor: 'rgba(30,70,30,0.25)',
  },
  iceCreamEmoji: {
    fontSize: 46,
  },
  player: {
    position: 'absolute',
    width: PLAYER_SIZE,
    height: 86,
    alignItems: 'center',
  },
  personShadow: {
    position: 'absolute',
    bottom: 0,
    width: 48,
    height: 16,
    borderRadius: 25,
    backgroundColor: 'rgba(30,50,30,0.28)',
  },
  playerHat: {
    width: 54,
    height: 16,
    zIndex: 4,
    marginBottom: -5,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    backgroundColor: '#238D45',
    transform: [{ rotate: '-5deg' }],
  },
  playerHead: {
    width: 37,
    height: 33,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: '#D89B6D',
  },
  playerFace: {
    fontSize: 14,
    fontWeight: '900',
    color: '#392417',
  },
  playerShirt: {
    width: 42,
    height: 29,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#E93434',
  },
  playerLetter: {
    fontSize: 17,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  playerPants: {
    width: 39,
    height: 16,
    backgroundColor: '#2B9C4B',
  },
  playerShoes: {
    width: 54,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  fruitShoe: {
    width: 25,
    height: 15,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
    backgroundColor: '#8E50C7',
  },
  shoeSwirl: {
    fontSize: 10,
    color: '#F0C6FF',
  },
  kid: {
    position: 'absolute',
    width: 48,
    height: 76,
    alignItems: 'center',
  },
  kidHead: {
    width: 33,
    height: 31,
    zIndex: 3,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 17,
    backgroundColor: '#E5AF82',
  },
  kidHair: {
    position: 'absolute',
    top: 0,
    width: 34,
    height: 10,
    backgroundColor: '#654026',
  },
  kidFace: {
    marginTop: 7,
    fontSize: 10,
    fontWeight: '900',
    color: '#4A2C1C',
  },
  kidShirt: {
    width: 33,
    height: 25,
    borderRadius: 7,
  },
  kidLegRow: {
    flexDirection: 'row',
  },
  kidLeg: {
    width: 8,
    height: 14,
    marginHorizontal: 4,
    backgroundColor: '#364A68',
  },
  chasingMark: {
    position: 'absolute',
    top: -30,
    zIndex: 5,
    fontSize: 31,
    fontWeight: '900',
    color: '#E42D2D',
  },
  countdownCircle: {
    position: 'absolute',
    top: '24%',
    alignSelf: 'center',
    zIndex: 200,
    minWidth: 105,
    height: 105,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 6,
    borderRadius: 55,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFCA33',
  },
  countdownText: {
    fontSize: 57,
    fontWeight: '900',
    color: '#B52A2A',
  },
  runText: {
    fontSize: 28,
  },
  hiddenNotice: {
    position: 'absolute',
    top: 15,
    alignSelf: 'center',
    zIndex: 250,
    paddingVertical: 9,
    paddingHorizontal: 25,
    borderWidth: 4,
    borderRadius: 25,
    borderColor: '#FFFFFF',
    backgroundColor: '#278F48',
  },
  hiddenNoticeText: {
    fontSize: 19,
    fontWeight: '900',
    letterSpacing: 2,
    color: '#FFFFFF',
  },
  dPad: {
    position: 'absolute',
    bottom: 18,
    left: 22,
    zIndex: 200,
    width: 190,
    height: 190,
  },
  moveButton: {
    position: 'absolute',
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderRadius: 18,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(39,101,171,0.9)',
  },
  moveButtonText: {
    marginTop: -4,
    fontSize: 41,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  upButton: {
    top: 0,
    left: 64,
  },
  leftButton: {
    top: 64,
    left: 0,
  },
  rightButton: {
    top: 64,
    right: 0,
  },
  downButton: {
    bottom: 0,
    left: 64,
  },
  dPadCentre: {
    position: 'absolute',
    top: 70,
    left: 70,
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: 'rgba(27,71,120,0.85)',
  },
  mapLabel: {
    position: 'absolute',
    right: 18,
    bottom: 18,
    maxWidth: 270,
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderWidth: 3,
    borderRadius: 18,
    borderColor: '#FFFFFF',
    backgroundColor: 'rgba(38,111,61,0.9)',
  },
  mapLabelText: {
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 2,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  mapLabelSmall: {
    marginTop: 3,
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    color: '#D8F5DF',
  },
  gameOverScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3B1A1A',
  },
  gameOverTitle: {
    fontSize: 58,
    fontWeight: '900',
    color: '#FF4B4B',
  },
  gameOverMessage: {
    marginTop: 12,
    fontSize: 25,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  returnMessage: {
    marginTop: 20,
    fontSize: 16,
    fontWeight: '700',
    color: '#F0BABA',
  },
  completeScreen: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#CCF3FF',
  },
  completeTitle: {
    fontSize: 43,
    fontWeight: '900',
    color: '#249447',
  },
  completeIceCream: {
    marginVertical: 8,
    fontSize: 60,
  },
  completeMessage: {
    fontSize: 22,
    fontWeight: '800',
    color: '#28556C',
  },
  nextMessage: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '800',
    color: '#E13C3C',
  },
  nextButton: {
    marginTop: 22,
    paddingVertical: 14,
    paddingHorizontal: 33,
    borderWidth: 4,
    borderRadius: 30,
    borderColor: '#FFFFFF',
    backgroundColor: '#FFCB36',
  },
  nextButtonText: {
    fontSize: 22,
    fontWeight: '900',
    color: '#713B18',
  },
});
