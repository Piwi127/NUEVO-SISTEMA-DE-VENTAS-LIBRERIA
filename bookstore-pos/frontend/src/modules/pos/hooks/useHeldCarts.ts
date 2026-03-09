import { useState, useEffect } from "react";
import { useToast } from "@/components/ToastProvider";
import { type CartItem } from "@/app/store";

const HELD_CARTS_KEY = "pos-held-carts-v1";
const MAX_HELD_CARTS = 20;

export type HeldCart = {
    id: string;
    label: string;
    created_at?: string;
    customer_id: number | null;
    promo_id: number | null;
    discount: number;
    tax: number;
    items: CartItem[];
};

export const getSuggestedHeldCartLabel = () =>
    `Pedido ${new Date().toLocaleTimeString("es-PE", { hour: "2-digit", minute: "2-digit" })}`;

type UseHeldCartsProps = {
    cartItems: CartItem[];
    cartDiscount: number;
    cartTax: number;
    customerId: number | string;
    promoId: number | string;
    clearCart: () => void;
    setCustomerId: (id: string | number | "") => void;
    setPromoId: (id: string | number | "") => void;
    replaceCart: (data: { items: CartItem[]; discount: number; tax: number }) => void;
    searchRef: React.MutableRefObject<HTMLInputElement | null>;
};

export const useHeldCarts = ({
    cartItems,
    cartDiscount,
    cartTax,
    customerId,
    promoId,
    clearCart,
    setCustomerId,
    setPromoId,
    replaceCart,
    searchRef,
}: UseHeldCartsProps) => {
    const { showToast } = useToast();
    const [heldOpen, setHeldOpen] = useState(false);
    const [holdDialogOpen, setHoldDialogOpen] = useState(false);
    const [holdLabel, setHoldLabel] = useState("");
    const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);

    const persistHeldCarts = (next: HeldCart[]) => {
        setHeldCarts(next);
        try {
            window.localStorage.setItem(HELD_CARTS_KEY, JSON.stringify(next));
        } catch {
            // ignore storage failures on restricted browsers
        }
    };

    const loadHeldCarts = () => {
        try {
            const raw = window.localStorage.getItem(HELD_CARTS_KEY);
            if (!raw) return;
            const parsed = JSON.parse(raw) as HeldCart[];
            if (Array.isArray(parsed)) {
                // Migrar campos antiguos create_at a created_at
                const migrated = parsed.map((cart) => {
                    const hasCreateAt = (cart as any).create_at;
                    const hasCreatedAt = cart.created_at;
                    return {
                        ...cart,
                        created_at: hasCreatedAt || hasCreateAt || undefined,
                    } as HeldCart;
                });
                setHeldCarts(
                    migrated.filter(
                        (cartItem) => cartItem && typeof cartItem.id === "string" && Array.isArray(cartItem.items)
                    )
                );
            }
        } catch {
            // ignore malformed data
        }
    };

    const holdCurrentCart = () => {
        if (!cartItems.length) {
            showToast({ message: "No hay items para guardar en espera", severity: "warning" });
            return;
        }
        setHoldLabel(getSuggestedHeldCartLabel());
        setHoldDialogOpen(true);
    };

    const handleConfirmHoldCurrentCart = () => {
        if (!cartItems.length) {
            setHoldDialogOpen(false);
            setHoldLabel("");
            showToast({ message: "No hay items para guardar en espera", severity: "warning" });
            return;
        }
        const label = holdLabel.trim() || getSuggestedHeldCartLabel();
        const nextHold: HeldCart = {
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            label,
            created_at: new Date().toISOString(),
            customer_id: customerId ? Number(customerId) : null,
            promo_id: promoId ? Number(promoId) : null,
            discount: Number(cartDiscount || 0),
            tax: Number(cartTax || 0),
            items: cartItems.map((item) => ({ ...item })),
        };
        persistHeldCarts([nextHold, ...heldCarts].slice(0, MAX_HELD_CARTS));
        clearCart();
        setCustomerId("");
        setPromoId("");
        setHoldDialogOpen(false);
        setHoldLabel("");
        showToast({ message: `Venta guardada en espera: ${label}`, severity: "success" });
    };

    const restoreHeldCart = (held: HeldCart) => {
        replaceCart({ items: held.items, discount: held.discount, tax: held.tax });
        setCustomerId(held.customer_id ?? "");
        setPromoId(held.promo_id ?? "");
        persistHeldCarts(heldCarts.filter((item) => item.id !== held.id));
        setHeldOpen(false);
        showToast({ message: `Venta recuperada: ${held.label}`, severity: "success" });
        window.setTimeout(() => searchRef.current?.focus(), 0);
    };

    const deleteHeldCart = (heldId: string) => {
        persistHeldCarts(heldCarts.filter((item) => item.id !== heldId));
    };

    useEffect(() => {
        loadHeldCarts();
    }, []);

    return {
        heldOpen,
        setHeldOpen,
        holdDialogOpen,
        setHoldDialogOpen,
        holdLabel,
        setHoldLabel,
        heldCarts,
        holdCurrentCart,
        handleConfirmHoldCurrentCart,
        restoreHeldCart,
        deleteHeldCart,
    };
};
