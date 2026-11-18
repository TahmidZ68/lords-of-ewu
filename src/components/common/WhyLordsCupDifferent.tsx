import { CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const TRADITIONAL_ITEMS = [
  'Allow players to enter only through pre-existing established teams.',
  'Favor established football cliques and familiar friend groups.',
  'Leave newer, solo, or less-experienced players without opportunities to play.',
];

const LORDS_CUP_ITEMS = [
  'Individual registration open to every student and enthusiast.',
  'Organized player selection and transparent live team draft.',
  'Balanced team formation designed for competitive fairness.',
  'Inclusive participation and equal opportunity on every matchday.',
];

export function WhyLordsCupDifferent() {
  return (
    <section className="border-b border-forest/15 bg-cream-50 py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <p className="font-display text-xs font-bold uppercase tracking-[0.26em] text-forest">
            Tournament Philosophy
          </p>
          <h2 className="mt-2 font-serif text-3xl font-bold text-charcoal md:text-4xl">
            WHY LORDS CUP IS DIFFERENT
          </h2>
          <p className="mt-3 font-display text-sm font-bold uppercase tracking-[0.22em] text-gold-600">
            EVERY PLAYER MATTERS. EVERY PLAYER BELONGS. EVERY PLAYER GETS A CHANCE.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <Card className="border-charcoal/15 bg-cream">
            <CardHeader className="border-b border-charcoal/10 pb-4">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-charcoal-400">
                Conventional Model
              </p>
              <CardTitle className="text-2xl text-charcoal-600">
                Traditional Tournaments Often
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="space-y-3.5 text-sm text-charcoal-500">
                {TRADITIONAL_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-700/80" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="border-2 border-gold bg-forest text-cream shadow-md">
            <CardHeader className="border-b border-gold/25 pb-4">
              <p className="font-display text-xs font-bold uppercase tracking-widest text-gold">
                The Lords of EWU Way
              </p>
              <CardTitle className="text-2xl text-cream">Lords Cup Focuses On</CardTitle>
            </CardHeader>
            <CardContent className="pt-5">
              <ul className="space-y-3.5 text-sm text-cream/90">
                {LORDS_CUP_ITEMS.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
}
