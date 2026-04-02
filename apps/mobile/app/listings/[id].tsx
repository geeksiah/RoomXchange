import { useEffect, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, Modal, Platform, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { formatAmenityLabel, formatMonthlyPrice } from "@roomxchange/shared/src/mobile";
import { Avatar } from "../../src/components/avatar";
import { BackIconButton } from "../../src/components/back-icon-button";
import { LoadingLabel } from "../../src/components/loading-label";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { api, session } = useSession();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const lightboxScrollRef = useRef<ScrollView>(null);
  const heroGalleryRef = useRef<ScrollView>(null);
  const bottomActionInset = Math.max(insets.bottom, Platform.OS === "android" ? 24 : 12);

  const listingQuery = useQuery({
    queryKey: ["listing", params.id],
    queryFn: () => api.getListing(params.id)
  });
  const conversationsQuery = useQuery({
    queryKey: ["conversations"],
    queryFn: () => api.getConversations(),
    enabled: Boolean(session)
  });

  const contactMutation = useMutation({
    mutationFn: () => api.openConversation({ listingId: params.id }),
    onSuccess: (conversation) => {
      router.push({
        pathname: "/messages/[conversationId]",
        params: { conversationId: conversation.conversationId }
      } as never);
    }
  });

  const deleteListingMutation = useMutation({
    mutationFn: () => api.deleteListing(params.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["home-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["explore-feed"] }),
        queryClient.invalidateQueries({ queryKey: ["my-listings"] }),
        queryClient.invalidateQueries({ queryKey: ["listing", params.id] })
      ]);
      router.replace("/profile/listings");
    }
  });

  const listing = listingQuery.data;

  const openLightbox = (index: number) => {
    setLightboxIndex(index);
    setLightboxVisible(true);
  };

  useEffect(() => {
    if (!lightboxVisible) {
      return;
    }

    const timer = setTimeout(() => {
      lightboxScrollRef.current?.scrollTo({ x: width * lightboxIndex, y: 0, animated: false });
    }, 0);

    return () => clearTimeout(timer);
  }, [lightboxIndex, lightboxVisible, width]);

  const openPublisherProfile = () => {
    router.push({
      pathname: "/publishers/[userId]",
      params: {
        userId: listing!.ownerId,
        name: listing!.ownerContact.name,
        avatar: listing!.ownerContact.avatar ?? "",
        phone: listing!.ownerContact.phone ?? "",
        listingId: listing!.listingId
      }
    } as never);
  };

  const openContact = () => {
    if (!session) {
      router.push({
        pathname: "/auth/login",
        params: { redirect: `/listings/${params.id}` }
      } as never);
      return;
    }

    const ownerId = listing?.ownerId;
    const existingConversation = ownerId
      ? conversationsQuery.data?.items.find((conversation) => conversation.participant.userId === ownerId)
      : undefined;
    if (existingConversation) {
      router.push({
        pathname: "/messages/[conversationId]",
        params: { conversationId: existingConversation.conversationId }
      } as never);
      return;
    }

    contactMutation.mutate();
  };

  if (!listing) {
    return (
      <SafeAreaView className="flex-1 items-center justify-center bg-rx-background">
        <Text className="font-jakarta text-sm text-rx-muted">
          {listingQuery.isLoading ? "Loading listing..." : "Listing not found."}
        </Text>
      </SafeAreaView>
    );
  }

  const lightboxGalleryKey = `${listing.listingId}-${lightboxVisible ? lightboxIndex : "hidden"}`;

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <View
        className="absolute inset-x-0 z-10 border-b border-rx-border bg-white"
        style={{ height: insets.top + 72 }}
      />
      <View
        className="absolute left-4 right-4 z-20 flex-row items-center justify-between"
        style={{ top: insets.top + 14 }}
      >
        <BackIconButton fallbackPath="/" />
        <Text className="flex-1 px-3 text-center font-jakarta-bold text-lg text-rx-text" numberOfLines={1}>
          Listing details
        </Text>
        <View className="rounded-full bg-rx-background px-4 py-2">
          <Text className="font-jakarta text-sm text-rx-text">{listing.images.length} photos</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 + bottomActionInset, paddingTop: insets.top + 72 }}>
        <View>
          <ScrollView
            ref={heroGalleryRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            onMomentumScrollEnd={(event) => {
              setActiveImageIndex(Math.round(event.nativeEvent.contentOffset.x / width));
            }}
          >
            {listing.images.map((image, index) => (
              <ScaleButton
                key={`${image}-${index}`}
                onPress={() => openLightbox(index)}
                className="overflow-hidden"
              >
                <Image source={image} style={{ width, height: 370 }} contentFit="cover" />
              </ScaleButton>
            ))}
          </ScrollView>
          <View className="absolute bottom-4 right-4">
            <ScaleButton onPress={() => openLightbox(activeImageIndex)} className="rounded-full bg-black/55 px-4 py-2.5">
              <Text className="font-jakarta-bold text-xs text-white">Open gallery</Text>
            </ScaleButton>
          </View>
        </View>

        {listing.images.length > 1 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3 px-4"
            contentContainerStyle={{ gap: 10, paddingRight: 16 }}
          >
            {listing.images.map((image, index) => (
              <ScaleButton
                key={`thumb-${image}-${index}`}
                onPress={() => {
                  heroGalleryRef.current?.scrollTo({ x: width * index, animated: true });
                  setActiveImageIndex(index);
                }}
                className={`overflow-hidden rounded-2xl border ${activeImageIndex === index ? "border-rx-accent" : "border-transparent"}`}
              >
                <Image source={image} style={{ width: 76, height: 76 }} contentFit="cover" />
              </ScaleButton>
            ))}
          </ScrollView>
        ) : null}

        <View className="rounded-t-[28px] bg-rx-background px-4 pt-5" style={{ marginTop: -22 }}>
          <Text className="font-jakarta-bold text-3xl text-rx-text">{listing.title}</Text>
          <Text className="mt-2 font-jakarta text-sm text-rx-muted">{listing.location}</Text>
          <Text className="mt-3 font-jakarta-bold text-2xl text-rx-text">{formatMonthlyPrice(listing.price)}</Text>

          <View className="mt-5 flex-row flex-wrap gap-2">
            {listing.amenities.map((amenity) => (
              <View key={amenity} className="rounded-full bg-white px-4 py-3">
                <Text className="font-jakarta text-sm text-rx-text">{formatAmenityLabel(amenity)}</Text>
              </View>
            ))}
          </View>

          <View className="mt-5 rounded-3xl bg-white p-5">
            <Text className="font-jakarta-bold text-xl text-rx-text">Description</Text>
            <Text className="mt-3 font-jakarta text-sm leading-6 text-rx-muted">{listing.description}</Text>
          </View>

        </View>
      </ScrollView>

      <View
        className="absolute inset-x-0 bottom-0 border-t border-rx-border bg-white px-4 pt-4"
        style={{
          paddingBottom: bottomActionInset + 10,
          shadowColor: "#111111",
          shadowOpacity: 0.06,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: -4 },
          elevation: 12
        }}
      >
        <View className="flex-row items-center">
          <ScaleButton onPress={openPublisherProfile} className="rounded-full">
            <Avatar name={listing.ownerContact.name} avatar={listing.ownerContact.avatar} size={44} />
          </ScaleButton>
          <Text className="ml-3 flex-1 font-jakarta-bold text-base text-rx-text" numberOfLines={1}>
            {listing.ownerContact.name}
          </Text>

          {session?.user.userId === listing.ownerId ? (
            <View className="flex-row gap-2">
              <ScaleButton
                onPress={() =>
                  router.push({
                    pathname: "/profile/listings/[id]",
                    params: { id: listing.listingId }
                  } as never)
                }
                className="rounded-full bg-rx-background px-4 py-4"
              >
                <Text className="font-jakarta-bold text-sm text-rx-text">Edit</Text>
              </ScaleButton>
              <ScaleButton
                onPress={() => {
                  if (deleteListingMutation.isPending) {
                    return;
                  }
                  Alert.alert("Delete listing", "This will remove the listing from the marketplace.", [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Delete",
                      style: "destructive",
                      onPress: () => deleteListingMutation.mutate()
                    }
                  ]);
                }}
                className="rounded-full bg-rx-accent px-4 py-4"
              >
                <LoadingLabel
                  loading={deleteListingMutation.isPending}
                  label="Delete"
                  loadingLabel="Deleting"
                  textClassName="font-jakarta-bold text-sm text-white"
                />
              </ScaleButton>
            </View>
          ) : (
            <ScaleButton onPress={openContact} disabled={contactMutation.isPending} className="rounded-full bg-rx-accent px-5 py-4">
              <LoadingLabel
                loading={contactMutation.isPending}
                label="Contact Owner"
                loadingLabel="Opening chat"
                textClassName="font-jakarta-bold text-sm text-white"
              />
            </ScaleButton>
          )}
        </View>
      </View>

      <Modal visible={lightboxVisible} transparent animationType="fade" onRequestClose={() => setLightboxVisible(false)}>
        <View className="flex-1 bg-black">
          <View className="absolute left-4 right-4 z-10 flex-row items-center justify-between" style={{ top: insets.top + 12 }}>
            <ScaleButton
              onPress={() => setLightboxVisible(false)}
              className="h-11 w-11 items-center justify-center rounded-full bg-white/14"
            >
              <Ionicons name="close" size={22} color="#FFFFFF" />
            </ScaleButton>
            <Text className="font-jakarta text-sm text-white">
              {lightboxIndex + 1} / {listing.images.length}
            </Text>
          </View>

          {lightboxVisible ? (
            <ScrollView
              key={lightboxGalleryKey}
              ref={lightboxScrollRef}
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              directionalLockEnabled
              nestedScrollEnabled
              removeClippedSubviews={false}
              contentOffset={{ x: width * lightboxIndex, y: 0 }}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(event) => {
                setLightboxIndex(Math.round(event.nativeEvent.contentOffset.x / width));
              }}
            >
              {listing.images.map((item, index) => (
                <View key={`${item}-${index}`} style={{ width, height }} className="items-center justify-center">
                  <Image source={item} style={{ width, height }} contentFit="contain" cachePolicy="memory-disk" />
                </View>
              ))}
            </ScrollView>
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}
