import React from 'react';

interface GameErrorBoundaryProps {
  children: React.ReactNode;
}

interface GameErrorBoundaryState {
  hasError: boolean;
}

export class GameErrorBoundary extends React.Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error('Game runtime error:', error);
  }

  private reload = () => {
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main dir="rtl" className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-6">
        <section className="w-full max-w-lg rounded-2xl border border-red-800/60 bg-stone-900 p-6 text-center shadow-2xl">
          <div className="text-5xl mb-3">⚠️</div>
          <h1 className="text-xl font-black font-cairo text-red-400 mb-2">توقفت اللعبة بشكل غير متوقع</h1>
          <p className="text-sm text-stone-300 leading-relaxed mb-5">
            حدث خطأ أثناء تشغيل إحدى وحدات اللعبة. جرّب إعادة التحميل لاستعادة غرفة العمليات دون فقدان سجل التقدم المحفوظ.
          </p>
          <button
            type="button"
            onClick={this.reload}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-lg transition-colors"
          >
            إعادة تشغيل اللعبة
          </button>
        </section>
      </main>
    );
  }
}
