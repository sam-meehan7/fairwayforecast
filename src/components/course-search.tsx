"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Search, MapPin, Loader2 } from "lucide-react";
import type { GolfCourseResult } from "@/lib/types";

interface CourseSearchProps {
  onSelect: (course: GolfCourseResult) => void;
}

export function CourseSearch({ onSelect }: CourseSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GolfCourseResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [selectedName, setSelectedName] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const fetchCourses = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      setIsOpen(false);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/courses/search?q=${encodeURIComponent(q)}`
      );
      const data = await res.json();
      setResults(data.courses || []);
      setIsOpen(true);
      setHighlightIndex(-1);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedName && query === selectedName) return;

    const timer = setTimeout(() => {
      fetchCourses(query);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, fetchCourses, selectedName]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(course: GolfCourseResult) {
    const name = course.club_name;
    setSelectedName(name);
    setQuery(name);
    setIsOpen(false);
    onSelect(course);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && highlightIndex >= 0) {
      e.preventDefault();
      handleSelect(results[highlightIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-foreground/60" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelectedName("");
          }}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search golf courses..."
          className="w-full h-12 pl-11 pr-10 rounded-base border-2 border-border bg-secondary-background text-foreground font-base placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-main"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-5 text-foreground/40 animate-spin" />
        )}
      </div>

      {isOpen && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-secondary-background border-2 border-border rounded-base shadow-shadow overflow-hidden">
          {results.map((course, i) => (
            <li key={course.id}>
              <button
                className={`w-full text-left px-4 py-3 flex items-start gap-3 transition-colors ${
                  i === highlightIndex
                    ? "bg-main text-main-foreground"
                    : "hover:bg-background"
                }`}
                onMouseEnter={() => setHighlightIndex(i)}
                onClick={() => handleSelect(course)}
              >
                <MapPin className="size-5 mt-0.5 shrink-0" />
                <div>
                  <div className="font-heading text-sm">
                    {course.club_name}
                  </div>
                  <div className="text-xs opacity-70">
                    {[course.city, course.state, course.country]
                      .filter(Boolean)
                      .join(", ")}
                  </div>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {isOpen && !loading && query.length >= 2 && results.length === 0 && (
        <div className="absolute z-50 w-full mt-1 bg-secondary-background border-2 border-border rounded-base shadow-shadow px-4 py-3 text-sm text-foreground/60">
          No courses found for &ldquo;{query}&rdquo;
        </div>
      )}
    </div>
  );
}
