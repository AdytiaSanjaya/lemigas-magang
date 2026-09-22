"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

type QuoteItem = {
  quote: string;
  author: string;
  username: string;
  avatar: string;
};

const quotes: QuoteItem[] = [
  {
    quote:
      "Magang di sini bukan sekadar rutinitas, ini adalah langkah awal membangun insting profesional dan relasi di dunia nyata.",
    author: "Adytia Sanjaya",
    username: "@adytiasanjaya",
    avatar: "/adit.png",
  },
  {
    quote:
      "Dari ruang kelas menuju dunia kerja, magang adalah jembatan untuk mewujudkan impian.",
    author: "fauzanYusuf",
    username: "@fauzaan",
    avatar: "/ucup.jpeg",
  },
  {
    quote:
      "Kesempatan tidak datang dua kali. Temukan tempat magangmu dan mulai perjalanan kariermu.",
    author: "MaulaFathanLbs",
    username: "@maul",
    avatar: "/maul.jpeg",
  },
];

export default function LoginQuoteCarousel() {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);
  const fadeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsVisible(false);
      fadeTimeout.current = setTimeout(() => {
        setActiveIndex((i) => (i + 1) % quotes.length);
        setIsVisible(true);
      }, 500);
    }, 5000);

    return () => {
      clearInterval(interval);
      if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    };
  }, []);

  function goTo(index: number) {
    if (index === activeIndex) return;
    if (fadeTimeout.current) clearTimeout(fadeTimeout.current);
    setIsVisible(false);
    fadeTimeout.current = setTimeout(() => {
      setActiveIndex(index);
      setIsVisible(true);
    }, 500);
  }

  const active = quotes[activeIndex];

  return (
    <div className="max-w-xl w-full">
      {/* Double-quote icon */}
      <svg
        aria-hidden="true"
        className="mb-6 h-14 w-14 text-gray-200"
        viewBox="0 0 48 48"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M14 28c-3.3 0-6-2.7-6-6 0-4.4 3.6-8 8-8 1.4 0 2.7.4 3.8 1C17.7 10.4 14.5 7 10.5 7v-4c7.2 0 13.5 5.1 15 12.1-.7-.1-1.3-.1-2-.1-5.5 0-10 4.5-10 10v3h.5ZM36 28c-3.3 0-6-2.7-6-6 0-4.4 3.6-8 8-8 1.4 0 2.7.4 3.8 1C39.7 10.4 36.5 7 32.5 7v-4c7.2 0 13.5 5.1 15 12.1-.7-.1-1.3-.1-2-.1-5.5 0-10 4.5-10 10v3h.5Z"
          fill="currentColor"
        />
      </svg>

      <div
        className={`transition-opacity duration-500 ${
          isVisible ? "opacity-100" : "opacity-0"
        }`}
      >
        <blockquote className="text-2xl text-gray-800 font-medium leading-relaxed mt-6">
          &ldquo;{active.quote}&rdquo;
        </blockquote>

        {/* Profile */}
        <div className="flex flex-row items-center gap-4 mt-8">
          <Image
            src={active.avatar}
            alt={active.author}
            width={48}
            height={48}
            className="w-12 h-12 rounded-full object-cover"
          />
          <div>
            <p className="font-semibold text-gray-900">{active.author}</p>
            <p className="text-sm text-gray-500">{active.username}</p>
          </div>
        </div>
      </div>

      {/* Indicator dots */}
      <div className="mt-8 flex items-center gap-2">
        {quotes.map((item, index) => (
          <button
            key={item.username}
            type="button"
            onClick={() => goTo(index)}
            aria-label={`Tampilkan kutipan ${index + 1}`}
            aria-current={index === activeIndex}
            className={`h-2 w-2 rounded-full transition-colors ${
              index === activeIndex
                ? "bg-gray-800"
                : "bg-gray-300 hover:bg-gray-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
