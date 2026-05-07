import { Star, ThumbsUp, ThumbsDown } from 'lucide-react';

export function Feedback() {
  const feedback = [
    { id: 1, user: 'Abebe Kebede', service: 'ID Card', rating: 5, comment: 'Excellent service! Very fast and professional staff.', date: '2024-05-01', helpful: 12 },
    { id: 2, user: 'Tigist Haile', service: 'Birth Certificate', rating: 4, comment: 'Good experience overall. Waiting time could be improved.', date: '2024-04-30', helpful: 8 },
    { id: 3, user: 'Mulugeta Assefa', service: 'Marriage Certificate', rating: 5, comment: 'Very satisfied with the service. Staff were very helpful.', date: '2024-04-28', helpful: 15 },
    { id: 4, user: 'Sara Mohammed', service: 'ID Card', rating: 3, comment: 'Service was okay but the process took longer than expected.', date: '2024-04-27', helpful: 5 },
    { id: 5, user: 'Yohannes Desta', service: 'Birth Certificate', rating: 5, comment: 'Smooth process from start to finish. Highly recommend!', date: '2024-04-25', helpful: 20 },
  ];

  const stats = {
    average: 4.4,
    total: 234,
    distribution: [
      { stars: 5, count: 145, percentage: 62 },
      { stars: 4, count: 56, percentage: 24 },
      { stars: 3, count: 21, percentage: 9 },
      { stars: 2, count: 8, percentage: 3 },
      { stars: 1, count: 4, percentage: 2 },
    ],
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl text-gray-800">Feedback & Reviews</h2>
        <p className="text-gray-600 text-sm">Monitor resident feedback and satisfaction</p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Average Rating */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg text-gray-800 mb-4">Overall Rating</h3>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-4xl text-gray-800 mb-2">{stats.average}</div>
              <div className="flex gap-1 mb-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`w-5 h-5 ${star <= Math.round(stats.average) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </div>
              <p className="text-sm text-gray-600">{stats.total} reviews</p>
            </div>
            <div className="flex-1 space-y-2">
              {stats.distribution.map((dist) => (
                <div key={dist.stars} className="flex items-center gap-2">
                  <span className="text-xs text-gray-600 w-8">{dist.stars} star</span>
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-yellow-400 transition-all"
                      style={{ width: `${dist.percentage}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-600 w-8 text-right">{dist.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Service Breakdown */}
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-100">
          <h3 className="text-lg text-gray-800 mb-4">Rating by Service</h3>
          <div className="space-y-4">
            {[
              { name: 'ID Card', rating: 4.6, reviews: 89 },
              { name: 'Birth Certificate', rating: 4.3, reviews: 67 },
              { name: 'Marriage Certificate', rating: 4.5, reviews: 78 },
            ].map((service) => (
              <div key={service.name} className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-800">{service.name}</p>
                  <p className="text-xs text-gray-500">{service.reviews} reviews</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-4 h-4 ${star <= Math.round(service.rating) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-800">{service.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Feedback List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg text-gray-800">Recent Feedback</h3>
        </div>

        <div className="divide-y divide-gray-100">
          {feedback.map((item) => (
            <div key={item.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h4 className="text-gray-800 mb-1">{item.user}</h4>
                  <p className="text-sm text-gray-500">{item.service}</p>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`w-4 h-4 ${star <= item.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                    />
                  ))}
                </div>
              </div>

              <p className="text-gray-700 mb-4">{item.comment}</p>

              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">{item.date}</span>
                <div className="flex items-center gap-4">
                  <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                    <ThumbsUp className="w-4 h-4" />
                    <span>{item.helpful}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-600 hover:text-blue-600 transition-colors">
                    <ThumbsDown className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
