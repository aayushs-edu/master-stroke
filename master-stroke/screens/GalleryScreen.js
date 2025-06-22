import React from 'react';
import { View, Text, FlatList, Image, TouchableOpacity } from 'react-native';

const artworks = [
  { id: '1', title: 'Eye Drawing', image: require('../assets/eye.jpg') },
];

export default function GalleryScreen() {
  return (
    <View style={{ flex: 1, padding: 20 }}>
      <FlatList
        data={artworks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity>
            <Image source={item.image} style={{ width: '100%', height: 200, marginBottom: 10 }} />
            <Text>{item.title}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}
