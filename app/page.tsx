'use client'

import Link from 'next/link'

export default function Home() {
  const menuItems = [
    {
      name: 'COT',
      description: 'Commitment of Traders data analysis',
      href: '/cot',
      icon: '📊',
    },
    // Add more items here as you create new views
    // {
    //   name: 'Another View',
    //   description: 'Description of another view',
    //   href: '/another-view',
    //   icon: '📈',
    // },
  ]

  return (
    <main className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Personal Finance
          </h1>
          <p className="text-gray-600">
            Financial data analysis and visualization platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {menuItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block p-6 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 border border-gray-200 hover:border-gold-primary cursor-pointer"
            >
              <div className="flex items-start space-x-4">
                <div className="text-4xl">{item.icon}</div>
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">
                    {item.name}
                  </h2>
                  <p className="text-gray-600 text-sm">{item.description}</p>
                </div>
                <div className="text-gray-400">→</div>
              </div>
            </Link>
          ))}
        </div>

        {menuItems.length === 0 && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No views available yet.</p>
          </div>
        )}
      </div>
    </main>
  )
}
