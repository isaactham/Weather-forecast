export function makeDrops() {
  return Array.from({ length: 38 }, (_, index) => {
    const duration = 0.75 + (index % 5) * 0.09;
    return {
      left: (index * 27.7) % 125,
      top: -40,
      staticTop: (index * 47) % 820,
      width: 1.5,
      height: 14 + (index % 4) * 5,
      opacity: 0.35 + (index % 3) * 0.15,
      duration,
      delay: -((index * 0.173) % 1) * duration
    };
  });
}

export function makeFlakes() {
  return Array.from({ length: 30 }, (_, index) => {
    const size = 3 + (index % 4) * 1.5;
    const duration = 7 + (index % 5) * 1.7;
    return {
      left: (index * 31.3) % 100,
      top: -20,
      staticTop: (index * 61) % 820,
      size,
      width: size,
      height: size,
      opacity: 0.7 + (index % 3) * 0.1,
      duration,
      delay: -((index * 1.37) % duration),
      swayDuration: 2.6 + (index % 3) * 0.6,
      swayDelay: -(index % 4) * 0.7
    };
  });
}

export function makeStars() {
  return Array.from({ length: 24 }, (_, index) => ({
    left: (index * 41.7) % 100,
    top: (index * 23.3) % 52 + 2,
    width: 1.2 + (index % 3) * 0.7,
    height: 1.2 + (index % 3) * 0.7,
    opacity: 0.7,
    duration: 2.4 + (index % 4) * 0.9,
    delay: -(index % 5) * 0.8
  }));
}

export function makeClouds() {
  return [
    { top: 70, left: -70, width: 270, height: 110, duration: 22, delay: 0 },
    { top: 190, left: 150, width: 300, height: 120, duration: 28, delay: -5 },
    { top: 330, left: -40, width: 250, height: 100, duration: 25, delay: -10 }
  ];
}
