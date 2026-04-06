import { fetchSiteConfig } from './db.js';

fetchSiteConfig().then(cfg => {
  if (cfg.ownerName) document.getElementById('about-name').textContent = cfg.ownerName;
  if (cfg.bio) document.getElementById('about-bio').textContent = cfg.bio;
  if (cfg.avatarUrl) {
    const el = document.getElementById('about-avatar');
    el.style.backgroundImage = `url('${cfg.avatarUrl}')`;
  }
  if (cfg.socialLinks?.github)
    document.getElementById('contact-github').href = cfg.socialLinks.github;
  if (cfg.socialLinks?.email)
    document.getElementById('contact-email').href = 'mailto:' + cfg.socialLinks.email;
});
