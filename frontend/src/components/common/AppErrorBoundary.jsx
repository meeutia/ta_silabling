import { Component } from 'react';
import { AlertTriangle, Home } from 'lucide-react';

export class AppErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      error,
    };
  }

  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    this.props.onReset?.();
  };

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-full bg-gray-50 p-4 md:p-8">
        <div className="mx-auto flex min-h-[55vh] max-w-3xl items-center justify-center">
          <div className="w-full rounded-2xl border border-red-100 bg-white p-4 text-center shadow-sm md:p-8">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
              <AlertTriangle className="h-7 w-7 text-red-600" />
            </div>

            <h1 className="text-2xl font-semibold text-gray-900">Halaman gagal dimuat</h1>
            <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-gray-600">
              Ada komponen halaman yang gagal dirender. Kembali ke halaman utama untuk membuka ulang modul ini dengan state bersih.
            </p>

            {import.meta.env.DEV && this.state.error?.message ? (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
                {this.state.error.message}
              </p>
            ) : null}

            <div className="mt-6 flex justify-center">
              <button
                type="button"
                onClick={this.handleReset}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
              >
                <Home className="h-4 w-4" />
                Kembali ke halaman utama
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default AppErrorBoundary;
