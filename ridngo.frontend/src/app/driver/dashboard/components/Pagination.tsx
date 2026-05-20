"use client"
import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const Pagination = ({ currentPage, totalPages, onPageChange }: any) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-center gap-4 pt-10">
      <button 
        disabled={currentPage === 0}
        onClick={() => onPageChange(currentPage - 1)}
        className="p-3 glass border-none rounded-xl disabled:opacity-20 hover:text-orange-btn transition-colors"
      >
        <ChevronLeft size={20} />
      </button>
      
      <span className="text-[10px] font-black uppercase tracking-widest opacity-40">
        Page {currentPage + 1} sur {totalPages}
      </span>

      <button 
        disabled={currentPage >= totalPages - 1}
        onClick={() => onPageChange(currentPage + 1)}
        className="p-3 glass border-none rounded-xl disabled:opacity-20 hover:text-orange-btn transition-colors"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
};