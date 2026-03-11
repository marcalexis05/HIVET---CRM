export const products = [
    // --- FOOD (10 Items) ---
    {
        id: 1, category: 'Dogs', type: 'Food', name: 'Grain-Free Alpine Salmon', price: '85.00',
        description: 'Wild-caught salmon from the Swiss Alps blended with mountain herbs for optimal digestion.',
        image: '/images/food_dog_salmon.png', tag: 'Organic', stars: 5
    },
    {
        id: 2, category: 'Cats', type: 'Food', name: 'Raw Vitality Rabbit Feast', price: '64.00',
        description: 'Pure, freeze-dried rabbit meat providing essential taurine and lean protein for active hunters.',
        image: '/images/food_cat_rabbit.png', tag: 'Raw-Diet', stars: 5
    },
    {
        id: 3, category: 'Dogs', type: 'Food', name: 'Puppy Growth Formula', price: '55.00',
        description: 'DHA-enriched kibble supporting brain development and strong bone growth in young pups.',
        image: '/images/food_dog_puppy.png', tag: 'Grain-Free', stars: 4
    },
    {
        id: 4, category: 'Cats', type: 'Food', name: 'Indoor Weight Control', price: '48.00',
        description: 'L-carnitine enriched formula designed to maintain a healthy weight for sedentary indoor cats.',
        image: '/images/food_cat_indoor.png', tag: 'Weight-Control', stars: 4
    },
    {
        id: 5, category: 'Dogs', type: 'Food', name: 'Senior Mobility Beef', price: '72.00',
        description: 'Soft-textured chunks with added glucosamine for older dogs with sensitive teeth and joints.',
        image: '/images/food_dog_senior.png', tag: 'Senior', stars: 5
    },
    {
        id: 6, category: 'Cats', type: 'Food', name: 'Sensitive Stomach Quail', price: '68.00',
        description: 'Hydrolyzed quail protein for cats with dermatological conditions or digestive sensitivities.',
        image: '/images/food_cat_quail.png', tag: 'Sensitive', stars: 4
    },
    {
        id: 7, category: 'Dogs', type: 'Food', name: 'High-Performance Bison', price: '95.00',
        description: 'Elite energy-dense bison protein for working breeds and high-energy athletic explorers.',
        image: '/images/food_bison_premium.png', tag: 'High-Protein', stars: 5
    },
    {
        id: 8, category: 'Cats', type: 'Food', name: 'Seafood Medley Pate', price: '32.00',
        description: 'A luxurious blend of shrimp, crab, and whitefish in a silk-textured gourmet pate.',
        image: '/images/food_cat_pate.png', tag: 'Gourmet', stars: 5
    },
    {
        id: 9, category: 'Dogs', type: 'Food', name: 'Sustainable Insect Protein', price: '58.00',
        description: 'Eco-friendly alternative protein source with zero-waste packaging for the modern pet parent.',
        image: '/images/food_dog_insect_protein.png', tag: 'Sustainable', stars: 4
    },
    {
        id: 10, category: 'Cats', type: 'Food', name: 'Kitten First-Year Mousse', price: '42.00',
        description: 'Ultra-soft transition food with colostrum to support a developing immune system.',
        image: '/images/food_cat_mousse.png', tag: 'Kitten', stars: 5
    },

    // --- ACCESSORIES (10 Items) ---
    {
        id: 11, category: 'Dogs', type: 'Accessories', name: 'Leather Trekking Harness', price: '145.00',
        description: 'Professional adventure harness with reinforced stitching and ergonomic support points.',
        image: '/images/product_dog_harness.png', tag: 'Handcrafted', stars: 5
    },
    {
        id: 12, category: 'Cats', type: 'Accessories', name: 'Scandinavian Cat Tree', price: '340.00',
        description: 'Multi-level architectural tree with organic wood branches and velvet resting platforms.',
        image: '/images/product_cat_tree.png', tag: 'Scandinavian', stars: 5
    },
    {
        id: 13, category: 'Dogs', type: 'Accessories', name: 'Night-Safe Reflective Lead', price: '45.00',
        description: 'Ultra-bright reflective threading integrated into high-tensile nylon for night walks.',
        image: '/images/acc_dog_reflective_lead.png', tag: 'Night-Safe', stars: 4
    },
    {
        id: 14, category: 'Cats', type: 'Accessories', name: 'Ceramic Water Fountain', price: '124.00',
        description: 'Hygienic ceramic flow system with whisper-quiet pump and triple carbon filtration.',
        image: '/images/product_cat_fountain.png', tag: 'Minimalist', stars: 5
    },
    {
        id: 15, category: 'Dogs', type: 'Accessories', name: 'Orthopedic Memory Bed', price: '195.00',
        description: 'High-density memory foam engineered for joint relief with a removable bamboo cover.',
        image: '/images/product_dog_bed.png', tag: 'Orthopedic', stars: 5
    },
    {
        id: 16, category: 'Cats', type: 'Accessories', name: 'Premium Velvet Nest', price: '89.00',
        description: 'Self-warming velvet sanctuary designed to reduce anxiety in nervous felines.',
        image: '/images/acc_cat_nest.png', tag: 'Designer', stars: 5
    },
    {
        id: 17, category: 'Dogs', type: 'Accessories', name: 'Elevated Bamboo Bowls', price: '78.00',
        description: 'Anti-slip bamboo stand at an optimal height to prevent bloat and improve neck posture.',
        image: '/images/product_dog_bowl.png', tag: 'Eco-Friendly', stars: 4
    },
    {
        id: 18, category: 'Cats', type: 'Accessories', name: 'Interactive Puzzle Toy', price: '45.00',
        description: 'Challenging treat-delivery puzzle made from sustainable rubber wood for cognitive play.',
        image: '/images/product_cat_toy.png', tag: 'Cognitive', stars: 5
    },
    {
        id: 19, category: 'Dogs', type: 'Accessories', name: 'Professional Travel Carrier', price: '165.00',
        description: 'Airline-approved ventilated carrier with plush lining and ergonomic shoulder strap.',
        image: '/images/product_dog_carrier.png', tag: 'Adventure-Ready', stars: 4
    },
    {
        id: 20, category: 'Cats', type: 'Accessories', name: 'Limited Velvet Collar', price: '55.00',
        description: 'Handcrafted velvet collar with a safety breakaway clasp and gold identity tag.',
        image: '/images/product_cat_collar.png', tag: 'Limited-Edition', stars: 5
    },

    // --- VITAMINS & CARE (10 Items) ---
    {
        id: 21, category: 'Dogs', type: 'Vitamins', name: 'Omega-3 Vitality Chew', price: '32.00',
        description: 'Cold-pressed wild Alaskan salmon oil chews for heart health and glossy skin.',
        image: '/images/vit_dog_main.png', tag: 'Coat-Vitality', stars: 5
    },
    {
        id: 22, category: 'Cats', type: 'Vitamins', name: 'Joint Support Glucosamine', price: '44.00',
        description: 'Liquid formula with Glucosamine and Chondroitin for senior cat hip and joint health.',
        image: '/images/vit_cat_joint.png', tag: 'Joint-Support', stars: 5
    },
    {
        id: 23, category: 'Dogs', type: 'Vitamins', name: 'Daily Pet Vitamins', price: '28.00',
        description: 'Complete daily nutritional support with 21 essential vitamins and minerals for dogs.',
        image: '/images/vit_dog_daily.png', tag: 'Daily-Health', stars: 4
    },
    {
        id: 24, category: 'Cats', type: 'Vitamins', name: 'L-Lysine Immunity Boost', price: '38.00',
        description: 'Veterinary strength L-Lysine to support respiratory health and immune function.',
        image: '/images/vit_cat_immune.png', tag: 'Immunity-Boost', stars: 5
    },
    {
        id: 25, category: 'Dogs', type: 'Vitamins', name: 'Dental Care Enzymes', price: '19.00',
        description: 'Enzymatic water additive that dissolves plaque and prevents tartar buildup.',
        image: '/images/vit_dog_dental.png', tag: 'Dental-Care', stars: 4
    },
    {
        id: 26, category: 'Cats', type: 'Vitamins', name: 'Multivitamin Soft Chews', price: '24.00',
        description: 'Comprehensive daily nutrition in a delicious chicken-flavored soft chew.',
        image: '/images/vit_cat_multi.png', tag: 'Multivitamin', stars: 5
    },
    {
        id: 27, category: 'Dogs', type: 'Vitamins', name: 'Sensitive Skin Remedy', price: '52.00',
        description: 'Grain-free therapeutic supplement for dogs with chronic environmental allergies.',
        image: '/images/vit_dog_sensitive.png', tag: 'Allergy-Support', stars: 5
    },
    {
        id: 28, category: 'Cats', type: 'Vitamins', name: 'Vision Advance Eyes', price: '65.00',
        description: 'Advanced antioxidant formula to support retina health and visual acuity.',
        image: '/images/vit_cat_vision.png', tag: 'Eye-Care', stars: 4
    },
    {
        id: 29, category: 'Dogs', type: 'Vitamins', name: 'Digestive Probiotic Blend', price: '48.00',
        description: 'A blend of 5 billion CFU per serving to restore gut flora and improve stool quality.',
        image: '/images/vit_dog_probiotic.png', tag: 'Probiotic', stars: 5
    },
    {
        id: 30, category: 'Cats', type: 'Vitamins', name: 'Urinary Tract Support', price: '36.00',
        description: 'D-Mannose and Cranberry blend to maintain healthy urinary tract function.',
        image: '/images/vit_cat_urinary.png', tag: 'Urinary-Support', stars: 4
    }
];
