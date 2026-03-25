import { useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { FlatList, Modal, Pressable, ScrollView, Text, View, useWindowDimensions } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { Image } from "expo-image";
import { formatAmenityLabel, formatMonthlyPrice } from "@roomxchange/shared";
import { Avatar } from "../../src/components/avatar";
import { BackIconButton } from "../../src/components/back-icon-button";
import { ScaleButton } from "../../src/components/scale-button";
import { useSession } from "../../src/session-provider";

export default function ListingDetailScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { api, session } = useSession();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const galleryRef = useRef<FlatList<string>>(null);
  const heroGalleryRef = useRef<ScrollView>(null);

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

  const listing = listingQuery.data;

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

  return (
    <SafeAreaView className="flex-1 bg-rx-background">
      <View
        className="absolute inset-x-0 z-10 bg-black/35"
        style={{ height: insets.top + 68 }}
      />
      <View
        className="absolute left-4 right-4 z-20 flex-row items-center justify-between"
        style={{ top: insets.top + 12 }}
      >
        <BackIconButton fallbackPath="/" />
        <View className="rounded-full bg-black/55 px-4 py-2">
          <Text className="font-jakarta text-sm text-white">{listing.images.length} photos</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 180 }}>
        <ScrollView
          ref={heroGalleryRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(event) => {
            setActiveImageIndex(Math.round(event.nativeEvent.contentOffset.x / width));
          }}
        >
          {listing.images.map((image, index) => (
            <Pressable
              key={`${image}-${index}`}
              onPress={() => {
                setLightboxIndex(index);
                setLightboxVisible(true);
              }}
            >
              <Image source={image} style={{ width, height: 370 }} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>

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
        className="absolute inset-x-0 bottom-0 border-t border-rx-border bg-white px-4 pb-8 pt-4"
        style={{
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
            <View className="rounded-full bg-rx-background px-5 py-4">
              <Text className="font-jakarta text-sm text-rx-muted">Your listing</Text>
            </View>
          ) : (
            <ScaleButton onPress={openContact} className="rounded-full bg-rx-accent px-5 py-4">
              <Text className="font-jakarta-bold text-sm text-white">
                {contactMutation.isPending ? "Opening..." : "Contact Owner"}
              </Text>
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

          <FlatList
            ref={galleryRef}
            data={listing.images}
            horizontal
            pagingEnabled
            initialScrollIndex={lightboxIndex}
            getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
            keyExtractor={(item, index) => `${item}-${index}`}
            onMomentumScrollEnd={(event) => {
              setLightboxIndex(Math.round(event.nativeEvent.contentOffset.x / width));
            }}
            renderItem={({ item }) => (
              <Image source={item} style={{ width, height }} contentFit="contain" />
            )}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
