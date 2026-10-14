import { useMemo } from 'react';
import { makeClouds, makeDrops, makeFlakes, makeStars } from '../utils/backgroundParticles.js';

const sceneParticles = {
  clouds: makeClouds(),
  drops: makeDrops(),
  flakes: makeFlakes(),
  stars: makeStars()
};

function particleStyle(particle, leftUnit = '%', topUnit = 'px') {
  return {
    left: `${particle.left}${leftUnit}`,
    top: `${particle.top}${topUnit}`,
    width: `${particle.width}px`,
    height: `${particle.height}px`,
    opacity: particle.opacity,
    animationDuration: `${particle.duration}s`,
    animationDelay: `${particle.delay}s`,
    ...(particle.staticTop === undefined ? {} : { '--static-top': `${particle.staticTop}px` })
  };
}

export function WeatherBackground({ condition = 'clear', isDark = false }) {
  const safeCondition = ['clear', 'cloudy', 'rain', 'snow', 'storm'].includes(condition)
    ? condition
    : 'clear';
  const clouds = useMemo(() => sceneParticles.clouds.map((cloud, index) => (
    <span
      className={`wb-cloud wb-cloud--${index === 1 ? 'middle' : 'outer'}`}
      key={`cloud-${index}`}
      style={particleStyle(cloud, 'px')}
    />
  )), []);
  const drops = useMemo(() => sceneParticles.drops.map((drop, index) => (
    <span className="wb-drop" key={`drop-${index}`} style={particleStyle(drop)} />
  )), []);
  const flakes = useMemo(() => sceneParticles.flakes.map((flake, index) => (
    <span className="wb-flake" key={`flake-${index}`} style={particleStyle(flake)}>
      <span
        className="wb-flake-dot"
        style={{
          width: `${flake.size}px`,
          height: `${flake.size}px`,
          animationDuration: `${flake.swayDuration}s`,
          animationDelay: `${flake.swayDelay}s`
        }}
      />
    </span>
  )), []);
  const stars = useMemo(() => sceneParticles.stars.map((star, index) => (
    <span
      className="wb-star"
      key={`star-${index}`}
      style={particleStyle(star, '%', '%')}
    />
  )), []);

  return (
    <div
      className="weather-background"
      data-condition={safeCondition}
      data-theme={isDark ? 'dark' : 'light'}
      aria-hidden="true"
    >
      <span className="wb-orb" />
      {['cloudy', 'rain', 'storm'].includes(safeCondition) && clouds}
      {['rain', 'storm'].includes(safeCondition) && drops}
      {safeCondition === 'snow' && flakes}
      {safeCondition === 'clear' && isDark && stars}
      {safeCondition === 'storm' && <span className="wb-flash" />}
    </div>
  );
}
