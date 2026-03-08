import React from "react";
import { Dialog, DialogContent, Slide } from "@mui/material";
import { TransitionProps } from "@mui/material/transitions";
import ProductForm from "./ProductForm";

const Transition = React.forwardRef(function Transition(
    props: TransitionProps & {
        children: React.ReactElement<any, any>;
    },
    ref: React.Ref<unknown>,
) {
    return <Slide direction="up" ref={ref} {...props} />;
});

export interface ProductFormModalProps {
    open: boolean;
    onClose: () => void;
    productId?: number | null;
}

export const ProductFormModal: React.FC<ProductFormModalProps> = ({ open, onClose, productId }) => {
    // We need to inject the productId to the form hook somehow if we mount it directly,
    // currently `useProductForm` reads from React Router `useParams()`.

    // To avoid rewriting `useProductForm` and breaking the Page-level editing,
    // we will update `useProductForm` to optionally accept an ID prop.
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullScreen
            TransitionComponent={Transition}
            PaperProps={{
                sx: {
                    background: "linear-gradient(135deg, rgba(248, 250, 252, 0.95) 0%, rgba(226, 232, 240, 0.95) 100%)",
                    backdropFilter: "blur(20px)",
                }
            }}
        >
            <DialogContent sx={{ p: { xs: 0, md: 3 } }}>
                <ProductForm productId={productId} onComplete={onClose} isModal />
            </DialogContent>
        </Dialog>
    );
};
