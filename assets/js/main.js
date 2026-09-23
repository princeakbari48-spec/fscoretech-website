(function(){
  const cfg = window.FSCORE_CONFIG || {};
  document.querySelectorAll('[data-github]').forEach(a=>{ if(cfg.githubUrl) a.href=cfg.githubUrl; });
  document.querySelectorAll('[data-email]').forEach(a=>{ if(cfg.contactEmail){ a.href='mailto:'+cfg.contactEmail; a.textContent=cfg.contactEmail; } });
  const btn=document.querySelector('.menu-btn');
  const links=document.querySelector('.navlinks');
  if(btn&&links){btn.addEventListener('click',()=>links.classList.toggle('open'));}
  document.querySelectorAll('[data-year]').forEach(el=>el.textContent=new Date().getFullYear());
})();
