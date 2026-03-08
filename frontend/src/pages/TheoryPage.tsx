import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Layout } from '../components/Layout';
import { useTheme } from '../hooks/useTheme';

// Teoria dla każdej operacji (kroki animowane)
const THEORY: Record<string, { title: string; steps: { text: string; visual: string }[] }> = {
  addition: {
    title: 'Jak dodawać pod kreską?',
    steps: [
      { text: 'Zapisujemy liczby jedna pod drugą, wyrównując do prawej strony (jedności pod jednościami, dziesiątki pod dziesiątkami).', visual: '  456\n+ 278\n─────' },
      { text: 'Zaczynamy od prawej kolumny (jedności). Dodajemy: 6 + 8 = 14. Zapisujemy 4 pod kreską, a 1 przenosimy do następnej kolumny.', visual: '  ¹\n  456\n+ 278\n─────\n    4' },
      { text: 'Dziesiątki: 5 + 7 + 1 (przeniesienie) = 13. Zapisujemy 3, przenosimy 1.', visual: '  ¹¹\n  456\n+ 278\n─────\n   34' },
      { text: 'Setki: 4 + 2 + 1 (przeniesienie) = 7. Zapisujemy 7.', visual: '  456\n+ 278\n─────\n  734' },
      { text: 'Wynik: 456 + 278 = 734 ✓', visual: '  456\n+ 278\n─────\n  734\n  ✓' },
    ]
  },
  subtraction: {
    title: 'Jak odejmować pod kreską?',
    steps: [
      { text: 'Zapisujemy liczby jedna pod drugą. Większa liczba na górze!', visual: '  521\n-  78\n─────' },
      { text: 'Jedności: 1 - 8. Za mało! Pożyczamy 10 z dziesiątek. Teraz 11 - 8 = 3.', visual: '  5²¹\n-  78\n─────\n    3' },
      { text: 'Dziesiątki: mamy już tylko 1 (pożyczyliśmy). 1 - 7. Za mało! Pożyczamy z setek. 11 - 7 = 4.', visual: '  4¹¹\n-  78\n─────\n   43' },
      { text: 'Setki: 4 - 0 = 4.', visual: '  521\n-  78\n─────\n  443' },
    ]
  },
  multiplication: {
    title: 'Jak mnożyć pod kreską?',
    steps: [
      { text: 'Mnożymy przez każdą cyfrę mnożnika osobno, od prawej.', visual: '  345\n\u00D7  23\n─────' },
      { text: 'Najpierw 345 \u00D7 3 (jedności mnożnika).', visual: '  345\n\u00D7  23\n─────\n 1035' },
      { text: 'Teraz 345 \u00D7 2 (dziesiątki). Wynik piszemy z przesunięciem o jedno miejsce w lewo (bo to dziesiątki).', visual: '  345\n\u00D7  23\n─────\n 1035\n6900 ' },
      { text: 'Dodajemy oba wyniki cząstkowe!', visual: '  345\n\u00D7  23\n─────\n 1035\n+6900\n─────\n 7935' },
    ]
  },
  division: {
    title: 'Jak dzielić pod kreską?',
    steps: [
      { text: 'Dzielnik piszemy po prawej stronie pionowej kreski. Dzielną po lewej.', visual: '126 | 6\n    |───' },
      { text: 'Bierzemy cyfry dzielnej od lewej — tyle ile potrzeba by podzielić. 12 \u00F7 6 = 2.', visual: '126 | 6\n 12 |───\n    | 2' },
      { text: 'Zapisujemy 2 w wyniku. Obliczamy 2 \u00D7 6 = 12. Odejmujemy od 12: reszta 0.', visual: '126 | 6\n 12 |───\n─── | 2\n  06' },
      { text: 'Piszemy w dół następną cyfrę dzielnej (6). Teraz 6 \u00F7 6 = 1.', visual: '126 | 6\n    |───\n    | 21\nWynik: 21 ✓' },
    ]
  },
};

export function TheoryPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { classes, theme } = useTheme();
  const ops: string[] = location.state?.operations || ['addition'];
  const [opIndex, setOpIndex] = useState(0);
  const [stepIndex, setStepIndex] = useState(0);

  const currentOp = ops[opIndex];
  const theory = THEORY[currentOp];
  const currentStep = theory.steps[stepIndex];
  const isLast = stepIndex === theory.steps.length - 1;
  const isLastOp = opIndex === ops.length - 1;

  function next() {
    if (!isLast) {
      setStepIndex(i => i + 1);
    } else if (!isLastOp) {
      setOpIndex(i => i + 1);
      setStepIndex(0);
    } else {
      navigate('/tutorial', { state: location.state });
    }
  }

  return (
    <Layout>
      <div className="w-full max-w-2xl mx-auto">
        <h2 className={`text-2xl sm:text-3xl font-bold ${classes.text} mb-4 text-center`}>{theory.title}</h2>

        {/* Wizualizacja */}
        <motion.div
          key={`${opIndex}-${stepIndex}`}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          className={`${classes.gridBg} ${theme === 'chalk' ? 'chalk-texture' : 'notebook-grid'} rounded-2xl p-6 mb-4 font-mono text-center`}
        >
          <pre className={`text-2xl sm:text-3xl lg:text-4xl ${classes.text} ${theme === 'chalk' ? 'chalk-text font-chalk' : 'font-notebook'} whitespace-pre`}>
            {currentStep.visual}
          </pre>
        </motion.div>

        {/* Opis */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`desc-${opIndex}-${stepIndex}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`${classes.card} p-4 mb-6 text-center`}
          >
            <p className={`${classes.text} text-lg sm:text-xl leading-relaxed`}>{currentStep.text}</p>
          </motion.div>
        </AnimatePresence>

        {/* Postęp */}
        <div className="flex justify-center gap-2 mb-4">
          {theory.steps.map((_, i) => (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all ${
                i === stepIndex
                  ? theme === 'chalk' ? 'bg-chalk-accent w-6' : 'bg-notebook-text w-6'
                  : i < stepIndex ? 'bg-green-400' : 'bg-gray-400/30'
              }`}
            />
          ))}
        </div>

        <button
          onClick={next}
          className={`w-full py-4 rounded-xl font-bold text-xl sm:text-2xl ${classes.button}`}
        >
          {isLast && isLastOp ? '🚀 Zacznijmy ćwiczyć!' : 'Dalej →'}
        </button>

        <button onClick={() => navigate('/learn')} className={`mt-2 w-full py-2 text-base sm:text-lg ${classes.text} opacity-50`}>
          ← Wróć
        </button>
      </div>
    </Layout>
  );
}
