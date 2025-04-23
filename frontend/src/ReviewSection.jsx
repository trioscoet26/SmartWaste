import React, { useState } from 'react';
import axios from 'axios';

const ReviewSection = () => {
  const [reviewText, setReviewText] = useState('');
  const [sentimentData, setSentimentData] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleReviewSubmit = async () => {
    if (!reviewText.trim()) return;

    setLoading(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL}analyze-review`, {
        review: reviewText
      });

      setSentimentData(res.data);
    } catch (error) {
      console.error('Error analyzing sentiment:', error);
      setSentimentData({ error: 'Failed to analyze review.' });
    } finally {
      setLoading(false);
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment) {
      case 'Positive':
        return '😊';
      case 'Negative':
        return '😞';
      default:
        return '😐';
    }
  };

  const getSentimentColor = (sentiment) => {
    switch (sentiment) {
      case 'Positive':
        return 'text-green-600';
      case 'Negative':
        return 'text-red-600';
      default:
        return 'text-yellow-600';
    }
  };

  return (
    <div className="my-6 w-full flex flex-col items-center">
      {/* Input Field */}
      <div className="w-full md:w-2/3 flex items-center gap-3">
        <input
          type="text"
          placeholder="Give your reviews for our products...."
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          className="flex-grow px-4 py-3 rounded-md border border-gray-300 dark:border-neutral-600 bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
        />
        <button
          onClick={handleReviewSubmit}
          className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-md font-medium transition duration-300"
          disabled={loading}
        >
          {loading ? 'Analyzing...' : 'Submit'}
        </button>
      </div>

      {/* Sentiment Result Display */}
      <div className="w-full md:w-2/3 mt-4 p-4 rounded-lg bg-white dark:bg-neutral-800 shadow border border-gray-200 dark:border-neutral-700">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-2">
          Sentiment Analysis:
        </h4>
        {sentimentData ? (
          sentimentData.error ? (
            <p className="text-red-500">{sentimentData.error}</p>
          ) : (
            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              <p className={`font-semibold flex items-center gap-2 ${getSentimentColor(sentimentData.sentiment)}`}>
                <span className="text-xl">{getSentimentIcon(sentimentData.sentiment)}</span>
                {sentimentData.sentiment} Sentiment
              </p>
              <p><span className="font-medium">Score:</span> {sentimentData.score}</p>
              <p><span className="font-medium">Tagged Words:</span> {sentimentData.words?.join(', ') || 'None'}</p>
              <p className="text-green-600 dark:text-green-400"><span className="font-medium">Positive Words:</span> {sentimentData.positive?.join(', ') || 'None'}</p>
              <p className="text-red-600 dark:text-red-400"><span className="font-medium">Negative Words:</span> {sentimentData.negative?.join(', ') || 'None'}</p>
            </div>
          )
        ) : (
          <p className="text-sm text-gray-500 dark:text-gray-400">
            No sentiment analysis yet. Submit a review to see results.
          </p>
        )}
      </div>
    </div>
  );
};

export default ReviewSection;
