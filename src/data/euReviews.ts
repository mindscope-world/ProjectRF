export interface EuReview {
  id: string;
  title: string;
  rating: number;
  body: string;
  author: string;
  date: string;
  image?: string;
}

export const EU_REVIEWS: EuReview[] = [
  {
    id: 'rev-1',
    title: 'Amazing',
    rating: 5,
    body: 'They are the real deal and they dont mess around. Very quick, well-packed, and helpful. I hope to use them for a long time.',
    author: 'Jen',
    date: 'June 8, 2026',
    image: '/src/assets/images/review_jen_photo_1788885312524.jpg',
  },
  {
    id: 'rev-2',
    title: 'Rapidfinil is the real deal!',
    rating: 5,
    body: 'From the ordering process to delivery, everything was smooth sailing and fast. Was hesitant at first with the way things',
    author: 'Adam',
    date: 'June 6, 2026',
    image: '/src/assets/images/review_adam_photo_1788885348302.jpg',
  },
  {
    id: 'rev-3',
    title: 'Excellent Experience with Rapidfinil!',
    rating: 5,
    body: 'I recently used the Rapidfinil website and had a surprisingly smooth experience from start to finish. The site is clean,',
    author: 'Kate Rick',
    date: 'May 26, 2026',
  },
  {
    id: 'rev-4',
    title: 'Reliable and Smooth Experience with Rapidfinil',
    rating: 5,
    body: "I came across Rapidfinil while looking for a dependable bulk supplier, and I'm glad I gave it a try. The whole process—from brow",
    author: 'Nathan Rings',
    date: 'April 6, 2026',
    image: '/src/assets/images/review_nathan_photo_1788885332803.jpg',
  },
  {
    id: 'rev-5',
    title: 'The biggest highlight for me was the consistency in quality.',
    rating: 5,
    body: "I've tried a few suppliers before, but Rapidfinil genuinely stood out. From the start, the ordering process was quick and",
    author: 'Helen Ryans',
    date: 'April 1, 2026',
  },
  {
    id: 'rev-6',
    title: '100% satisfied with every order!',
    rating: 5,
    body: "I have ordered at 10 times in the last couple of years from these guys and I'm always 100% satisfied with the product an",
    author: 'Anonymous',
    date: 'January 14, 2026',
  },
];
