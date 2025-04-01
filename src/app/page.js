export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-900 text-white">
      {/* Hero Section */}
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]" />
        
        <div className="glass-effect p-8 max-w-4xl relative z-10">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 gradient-text">
            Welcome to Healthify
          </h1>
          <p className="text-xl md:text-2xl text-gray-200 mb-8 max-w-2xl mx-auto">
            Manage your health from one place. Schedule appointments, track medications, and monitor your well-being with our comprehensive healthcare platform.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="/register"
              className="button-gradient text-lg"
            >
              Get Started
            </a>
            <a
              href="/login"
              className="px-6 py-3 rounded-lg font-medium border border-white/30 hover:bg-white/10 transition-colors text-lg backdrop-blur-sm"
            >
              Sign In
            </a>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 py-20">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 gradient-text">
          Why Choose Healthify?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="card group">
            <div className="h-12 w-12 mb-4 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Easy Scheduling</h3>
            <p className="text-gray-300">Book appointments with your healthcare providers quickly and easily.</p>
          </div>

          <div className="card group">
            <div className="h-12 w-12 mb-4 rounded-full bg-gradient-to-br from-green-500 to-teal-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Health Tracking</h3>
            <p className="text-gray-300">Monitor your medications, symptoms, and overall well-being in one place.</p>
          </div>

          <div className="card group">
            <div className="h-12 w-12 mb-4 rounded-full bg-gradient-to-br from-pink-500 to-rose-500 flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold mb-2">Secure Platform</h3>
            <p className="text-gray-300">Your health information is protected with industry-standard security measures.</p>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center py-20 px-4">
        <div className="glass-effect max-w-3xl mx-auto p-8">
          <h2 className="text-3xl md:text-4xl font-bold mb-6 gradient-text">
            Ready to Take Control of Your Health?
          </h2>
          <p className="text-xl text-gray-200 mb-8">
            Join thousands of users who trust Healthify for their healthcare management needs.
          </p>
          <a
            href="/register"
            className="button-gradient text-lg inline-block"
          >
            Get Started Today
          </a>
        </div>
      </div>
    </div>
  );
}
