import { makeClouds, makeDrops, makeFlakes, makeStars } from '../utils/backgroundParticles.js';

// Stable module-level arrays keep each scene's particle positions from shifting.
const particles = {
  clouds: makeClouds(),
  drops: makeDrops(),
  flakes: makeFlakes(),
  stars: makeStars()
};

function particleStyle(particle, leftUnit = '%', topUnit = 'px') {
  const staticTop = particle.staticTop === undefined ? '' : `;--static-top:${particle.staticTop}px`;
  return `left:${particle.left}${leftUnit};top:${particle.top}${topUnit};width:${particle.width}px;height:${particle.height}px;opacity:${particle.opacity};animation-duration:${particle.duration}s;animation-delay:${particle.delay}s${staticTop}`;
}

function renderClouds() {
  return particles.clouds.map((cloud, index) => {
    const kind = index === 1 ? 'middle' : 'outer';
    return `<span class="wb-cloud wb-cloud--${kind}" style="${particleStyle(cloud, 'px')}"></span>`;
  }).join('');
}

function renderDrops() {
  return particles.drops.map(drop => `<span class="wb-drop" style="${particleStyle(drop)}"></span>`).join('');
}

function renderFlakes() {
  return particles.flakes.map(flake => `<span class="wb-flake" style="${particleStyle(flake)}"><span class="wb-flake-dot" style="width:${flake.size}px;height:${flake.size}px;animation-duration:${flake.swayDuration}s;animation-delay:${flake.swayDelay}s"></span></span>`).join('');
}

function renderStars() {
  return particles.stars.map(star => `<span class="wb-star" style="${particleStyle(star, '%', '%')}"></span>`).join('');
}

export function WeatherBackground({ condition, isDark }) {
  const supportedConditions = ['clear', 'cloudy', 'rain', 'snow', 'storm'];
  const safeCondition = supportedConditions.includes(condition) ? condition : 'clear';
  const theme = isDark ? 'dark' : 'light';
  let layers = '<span class="wb-orb"></span>';

  if (['cloudy', 'rain', 'storm'].includes(safeCondition)) layers += renderClouds();
  if (safeCondition === 'rain' || safeCondition === 'storm') layers += renderDrops();
  if (safeCondition === 'snow') layers += renderFlakes();
  if (safeCondition === 'clear' && isDark) layers += renderStars();
  if (safeCondition === 'storm') layers += '<span class="wb-flash"></span>';

  return `<div class="weather-background" data-condition="${safeCondition}" data-theme="${theme}" aria-hidden="true">${layers}</div>`;
}
