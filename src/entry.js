async function boot() {
  try {
    const res=await fetch('/api/health',{credentials:'omit',cache:'no-store'});
    if(res.ok && (await res.json()).service==='digi-condominio'){
      await import('./connected.js');
      return;
    }
  }catch{/* The static preview does not expose an API; use explicit demo. */}
  await import('./main.js');
}
boot();
