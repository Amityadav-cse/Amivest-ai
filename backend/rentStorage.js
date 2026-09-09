const RENT_LISTINGS_KEY = "amivest_rent_listings";

export function getRentListings() {
    try {
        const saved =
            localStorage.getItem(RENT_LISTINGS_KEY);

        if (!saved) {
            return [];
        }

        const parsed = JSON.parse(saved);

        return Array.isArray(parsed) ?
            parsed : [];
    } catch (error) {
        console.error(
            "Failed to read rent listings:",
            error
        );

        return [];
    }
}

export function saveRentListing(listing) {
    const current =
        getRentListings();

    const newListing = {
        ...listing,

        id: listing.id ||
            `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,

        status: listing.status || "pending",

        createdAt: listing.createdAt ||
            new Date().toISOString(),
    };

    const updated = [
        newListing,
        ...current,
    ];

    localStorage.setItem(
        RENT_LISTINGS_KEY,
        JSON.stringify(updated)
    );

    return newListing;
}

export function clearRentListings() {
    localStorage.removeItem(
        RENT_LISTINGS_KEY
    );
}