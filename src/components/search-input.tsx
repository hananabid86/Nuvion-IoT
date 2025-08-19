"use client";

import { Search } from 'lucide-react';
import { Input } from './ui/input';
import { useSearch } from '@/hooks/use-search';
import { useDebounce } from '@/hooks/use-debounce';
import { useEffect, useState } from 'react';

export function SearchInput() {
    const { setSearchTerm } = useSearch();
    const [value, setValue] = useState('');
    const debouncedValue = useDebounce(value, 300);

    useEffect(() => {
        setSearchTerm(debouncedValue);
    }, [debouncedValue, setSearchTerm]);


    return (
        <div className="relative w-full max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search devices by name..."
                className="pl-9"
                value={value}
                onChange={(e) => setValue(e.target.value)}
            />
        </div>
    );
}
