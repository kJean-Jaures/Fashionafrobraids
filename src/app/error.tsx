"use client";
export default function ErrorPage({ reset }: { reset: () => void }) { return <div className="container section empty-state"><h1>Un instant…</h1><p>La page n’a pas pu être chargée. Réessayez.</p><button className="button primary" onClick={reset}>Recharger la page</button></div>; }
