import { useEffect } from "react";

type PosKeyboardProps = {
    itemCount: number;
    searchRef: React.MutableRefObject<HTMLInputElement | null>;
    setPayOpen: (open: boolean) => void;
};

export const usePosKeyboard = ({ itemCount, searchRef, setPayOpen }: PosKeyboardProps) => {
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "F2") {
                event.preventDefault();
                searchRef.current?.focus();
            }
            if (event.key === "F4") {
                event.preventDefault();
                if (itemCount > 0) setPayOpen(true);
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [itemCount, setPayOpen, searchRef]);
};
