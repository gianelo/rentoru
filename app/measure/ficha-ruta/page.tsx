import Link from "next/link";
import { notFound } from "next/navigation";

/** Test-only client navigation; never available without the disposable DB harness. */
export default function FichaRutaHarness() {
  if (!process.env.TEST_DATABASE_URL) notFound();
  return (
    <main>
      <Link href="/alquiler/maracaibo/coquivacoa/aviso-inexistente-00000000-0000-4000-8000-000000000001">
        Abrir ficha inexistente
      </Link>
    </main>
  );
}
