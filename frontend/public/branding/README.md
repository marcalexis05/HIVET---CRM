# Hi-Vet orange logo

`hivet-logo.png` is the approved two-paw logo with a transparent background (1254 × 1254). The shared website Logo component selects an appropriately sized transparent image for navigation, dashboards, password recovery, and footers. Login and registration pages use the logo in the form header.

Browser icons: `favicon-16.png`, `favicon-32.png`.

PWA icons: `icon-192.png`, `icon-512.png` (transparent); `icon-maskable-192.png`, `icon-maskable-512.png` (white background and padding for launcher masks). The default, customer, clinic, and rider manifests use these files.

Apple home-screen icon: `apple-touch-icon.png` (180 × 180, white background).

Regenerate resized icons from the master with `./scripts/build-brand-icons.ps1` from the repository root. Preserve the transparent master; the white backgrounds in maskable and Apple icons are intentional.

## Image generation

Tool: built-in image generation, edit mode with transparent background enabled.

Edit target: the approved orange two-paw Hi-Vet logo from this conversation.

Final prompt:

> Use case: background-extraction. Edit target: the supplied approved orange Hi-Vet logo. Remove only the white background and make it genuinely transparent, including the white holes inside the four toes and central pad of each paw, the holes in letters, and spaces between elements. Preserve the exact two raised paws, their positions and proportions, the orange colors, and exact bold rounded "Hi-Vet" lettering. Preserve soft fading forelegs as orange pixels with gradually decreasing alpha, not fading to opaque white. Keep all orange artwork clean and fully readable, edges smooth, no white halo. Do not redesign or add elements. Output the same logo isolated on real transparent background with modest clear padding, suitable as a website branding asset.
