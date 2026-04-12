import 'dart:io';

class AppConstants {
  // Use 10.0.2.2 for Android Emulator, localhost for iOS/others
  static String get baseUrl {
    if (Platform.isAndroid) {
      return 'http://10.0.2.2:8000';
    }
    return 'http://localhost:8000';
  }

  static const String appTitle = 'Hi-Vet Rider';
}
