"use client";

import { useState, useEffect } from 'react'
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'
import {
    Dialog,
    DialogPanel,
    Popover,
    PopoverButton,
    PopoverGroup,
    PopoverPanel,
} from '@headlessui/react'
import { ChevronDownIcon } from '@heroicons/react/20/solid'

const navigation = [
    { name: 'Latest', href: '#', value: 'latest' },
    { name: 'By Date', href: '#', value: 'by-date' }
]

export default function Header({ onTagClick, slug = null }) {
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
    const [tags, setTags] = useState([])
    const [people, setPeople] = useState([])
    const [cameras, setCameras] = useState([])
    const [lenses, setLenses] = useState([])

    useEffect(() => {
        const loadFilters = async () => {
            try {
                const url = slug ? `/api/images?slug=${slug}` : '/api/images';
                const response = await fetch(url);
                const data = await response.json();
                console.log("Fetched images:", data);

                const rows = data.results || [];

                // Extract tags
                const tagSet = new Set();
                rows.forEach(row => {
                    const tags = (row.tags || "").split(",").map(t => t.trim());
                    tags.forEach(tag => tag && tagSet.add(tag));
                });

                // Extract people
                const peopleSet = new Set();
                rows.forEach(row => {
                    const people = (row.people || "").split(",").map(p => p.trim());
                    people.forEach(person => person && peopleSet.add(person));
                });

                // Extract cameras (combine camera_make + camera)
                const cameraSet = new Set();
                rows.forEach(row => {
                    const cameraMake = (row.camera_make || "").trim();
                    const camera = (row.camera || "").trim();
                    if (cameraMake && camera) {
                        cameraSet.add(`${cameraMake} ${camera}`);
                    } else if (camera) {
                        cameraSet.add(camera);
                    }
                });

                // Extract lenses (combine lens_make + lens)
                const lensSet = new Set();
                rows.forEach(row => {
                    const lensMake = (row.lens_make || "").trim();
                    const lens = (row.lens || "").trim();
                    if (lensMake && lens) {
                        lensSet.add(`${lensMake} ${lens}`);
                    } else if (lens) {
                        lensSet.add(lens);
                    }
                });

                setTags(Array.from(tagSet).sort().map(tag => ({ name: tag })));
                setPeople(Array.from(peopleSet).sort().map(person => ({ name: person })));
                setCameras(Array.from(cameraSet).sort().map(camera => ({ name: camera })));
                setLenses(Array.from(lensSet).sort().map(lens => ({ name: lens })));
            } catch (error) {
                console.error("Error loading filters from API:", error);
            }
        };

        loadFilters();
    }, [slug]);

    return (
        <header>
            <nav aria-label="Global" className="mx-auto flex max-w-7xl items-center justify-between p-6 lg:px-8">
                <div className="flex flex-1">
                    <div className="hidden lg:flex lg:gap-x-12">
                        {navigation.map((item) =>
                            item.name === "Latest" ? (
                                <button
                                    key={item.name}
                                    onClick={() => onTagClick("latest")}
                                    className="flex items-center text-sm font-semibold leading-none text-white"
                                >
                                    {item.name}
                                </button>
                            ) : (
                                <button
                                    key={item.name}
                                    onClick={() => onTagClick(item.value)}
                                    className="flex items-center text-sm font-semibold leading-none text-white"
                                >
                                    {item.name}
                                </button>
                            )
                        )}
                        <PopoverGroup className="hidden lg:flex lg:gap-x-12">
                            {(tags.length > 0 || people.length > 0) && (
                            <Popover className="relative">
                                <PopoverButton className="flex items-center gap-x-1 text-sm/6 font-semibold text-white">
                                    Filter
                                    <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                                </PopoverButton>

                                <PopoverPanel className="absolute z-10 mt-3 w-screen max-w-md rounded-lg bg-white shadow-lg ring-1 ring-gray-900/5">
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {people.map((item) => (
                                            <Popover.Button
                                                key={item.name}
                                                className="group flex items-center gap-x-6 rounded-lg p-2 text-sm hover:bg-gray-50 cursor-pointer"
                                                onClick={() => onTagClick(item.name)}
                                            >
                                                <span className="block font-semibold text-gray-900">{item.name}</span>
                                            </Popover.Button>
                                        ))}
                                        {tags.map((item) => (
                                            <Popover.Button
                                                key={item.name}
                                                className="group flex items-center gap-x-6 rounded-lg p-2 text-sm hover:bg-gray-50 cursor-pointer"
                                                onClick={() => onTagClick(item.name)}
                                            >
                                                <span className="block font-semibold text-gray-900">{item.name}</span>
                                            </Popover.Button>
                                        ))}
                                    </div>
                                </PopoverPanel>
                            </Popover>
                            )}
                            
                            {(cameras.length > 0 || lenses.length > 0) && (
                            <Popover className="relative">
                                <PopoverButton className="flex items-center gap-x-1 text-sm/6 font-semibold text-white">
                                    Gear
                                    <ChevronDownIcon aria-hidden="true" className="size-5 flex-none text-gray-400" />
                                </PopoverButton>

                                <PopoverPanel className="absolute z-10 mt-3 w-screen max-w-md rounded-lg bg-white shadow-lg ring-1 ring-gray-900/5">
                                    <div className="p-4 flex flex-wrap gap-2">
                                        {cameras.map((item) => (
                                            <Popover.Button
                                                key={item.name}
                                                className="group flex items-center gap-x-6 rounded-lg p-2 text-sm hover:bg-gray-50 cursor-pointer"
                                                onClick={() => onTagClick(item.name)}
                                            >
                                                <span className="block font-semibold text-gray-900">{item.name}</span>
                                            </Popover.Button>
                                        ))}
                                        {lenses.map((item) => (
                                            <Popover.Button
                                                key={item.name}
                                                className="group flex items-center gap-x-6 rounded-lg p-2 text-sm hover:bg-gray-50 cursor-pointer"
                                                onClick={() => onTagClick(item.name)}
                                            >
                                                <span className="block font-semibold text-gray-900">{item.name}</span>
                                            </Popover.Button>
                                        ))}
                                    </div>
                                </PopoverPanel>
                            </Popover>
                            )}
                        </PopoverGroup>
                    </div>
                    <div className="flex lg:hidden">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(true)}
                            className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-white"
                        >
                            <span className="sr-only">Open main menu</span>
                            <Bars3Icon aria-hidden="true" className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                <a href="#" className="-m-1.5 p-1.5">
                    <img
                        alt=""
                        src="/logo.svg"
                        className="h-8 w-auto"
                        onClick={() => onTagClick("latest")}
                    />
                </a>
                <div className="flex flex-1 justify-end">
                    <button
                        onClick={() => onTagClick("shuffle")}
                        className="text-sm font-semibold text-white"
                    >
                        Shuffle
                    </button>
                </div>
            </nav>
            <Dialog open={mobileMenuOpen} onClose={setMobileMenuOpen} className="lg:hidden">
                <div className="fixed inset-0 z-10" />
                <DialogPanel className="fixed inset-y-0 left-0 z-10 w-full overflow-y-auto mobile-dialog-panel px-6 py-6">
                    <div className="flex items-center justify-between">
                        <button
                            type="button"
                            onClick={() => setMobileMenuOpen(false)}
                            className="-m-2.5 rounded-md p-2.5 text-gray-700"
                        >
                            <span className="sr-only">Close menu</span>
                            <XMarkIcon aria-hidden="true" className="h-6 w-6" />
                        </button>
                        <div className="absolute left-1/2 transform -translate-x-1/2">
                            <a href="#" className="p-1.5">
                                <img
                                    alt="Logo"
                                    src="/logo.svg"
                                    className="h-8 w-auto"
                                />
                            </a>
                        </div>
                        <div className="flex flex-1 justify-end">
                            <a
                                href="#"
                                className="text-sm font-semibold text-white"
                                onClick={() => {
                                    onTagClick("latest");
                                    setMobileMenuOpen(false);
                                }}
                            >
                                Latest
                            </a>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap gap-2">
                        {people.map((item) => (
                            <a
                                key={item.name}
                                href="#"
                                className="rounded-lg px-3 py-2 text-base font-semibold text-white bg-gray-800 hover:bg-gray-900"
                                onClick={() => {
                                    onTagClick(item.name);
                                    setMobileMenuOpen(false);
                                }}
                            >
                                {item.name}
                            </a>
                        ))}
                        {tags.map((item) => (
                            <a
                                key={item.name}
                                href="#"
                                className="rounded-lg px-3 py-2 text-base font-semibold text-white bg-gray-800 hover:bg-gray-900"
                                onClick={() => {
                                    onTagClick(item.name);
                                    setMobileMenuOpen(false);
                                }}
                            >
                                {item.name}
                            </a>
                        ))}
                        {cameras.map((item) => (
                            <a
                                key={item.name}
                                href="#"
                                className="rounded-lg px-3 py-2 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                    onTagClick(item.name);
                                    setMobileMenuOpen(false);
                                }}
                            >
                                {item.name}
                            </a>
                        ))}
                        {lenses.map((item) => (
                            <a
                                key={item.name}
                                href="#"
                                className="rounded-lg px-3 py-2 text-base font-semibold text-white bg-blue-600 hover:bg-blue-700"
                                onClick={() => {
                                    onTagClick(item.name);
                                    setMobileMenuOpen(false);
                                }}
                            >
                                {item.name}
                            </a>
                        ))}
                    </div>
                </DialogPanel>
            </Dialog>
        </header>
    )
}
