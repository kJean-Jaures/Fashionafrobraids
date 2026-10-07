import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export default function NotFound() { return <div className="container section empty-state"><p className="eyebrow">Fashion Afro Braids</p><h1>Cette page reste à trouver.</h1><p>Le lien n’est pas valide ou n’est plus disponible.</p><Link href="/" className="button primary">Retour à l’accueil <ArrowUpRight size={18}/></Link></div>; }
