import 'dart:convert';
import 'dart:async';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:http/http.dart' as http;
import 'auth_provider.dart';
import '../core/constants.dart';

final riderProvider = StateNotifierProvider<RiderNotifier, RiderState>((ref) {
  final authState = ref.watch(authProvider);
  return RiderNotifier(authState.token);
});

class RiderState {
  final bool isOnline;
  final Map<String, dynamic> earnings;
  final List<dynamic> availableOrders;
  final Map<String, dynamic>? activeOrder;
  final bool isLoading;
  final String? error;

  RiderState({
    this.isOnline = false,
    this.earnings = const {
      'today_earnings': 0,
      'total_earnings': 0,
      'completed_orders': 0
    },
    this.availableOrders = const [],
    this.activeOrder,
    this.isLoading = false,
    this.error,
  });

  RiderState copyWith({
    bool? isOnline,
    Map<String, dynamic>? earnings,
    List<dynamic>? availableOrders,
    Map<String, dynamic>? activeOrder,
    bool? isLoading,
    String? error,
    bool clearActiveOrder = false,
  }) {
    return RiderState(
      isOnline: isOnline ?? this.isOnline,
      earnings: earnings ?? this.earnings,
      availableOrders: availableOrders ?? this.availableOrders,
      activeOrder: clearActiveOrder ? null : (activeOrder ?? this.activeOrder),
      isLoading: isLoading ?? this.isLoading,
      error: error ?? this.error,
    );
  }
}

class RiderNotifier extends StateNotifier<RiderState> {
  final String? token;
  Timer? _refreshTimer;

  RiderNotifier(this.token) : super(RiderState()) {
    if (token != null) {
      fetchData();
      _startPeriodicRefresh();
    }
  }

  void _startPeriodicRefresh() {
    _refreshTimer?.cancel();
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (timer) {
      if (token != null) fetchData();
    });
  }

  @override
  void dispose() {
    _refreshTimer?.cancel();
    super.dispose();
  }

  Future<void> fetchData() async {
    if (token == null) return;

    try {
      final headers = {'Authorization': 'Bearer $token'};

      // 1. Profile (Online status)
      final profRes = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/rider/profile'),
        headers: headers,
      );

      // 2. Earnings
      final earnRes = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/rider/earnings'),
        headers: headers,
      );

      // 3. Available Tasks
      final taskRes = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/rider/available-tasks'),
        headers: headers,
      );

      // 4. Active Order
      final activeRes = await http.get(
        Uri.parse('${AppConstants.baseUrl}/api/rider/active-order'),
        headers: headers,
      );

      if (profRes.statusCode == 200 &&
          earnRes.statusCode == 200 &&
          taskRes.statusCode == 200 &&
          activeRes.statusCode == 200) {
        final profData = jsonDecode(profRes.body);
        final earnData = jsonDecode(earnRes.body);
        final taskData = jsonDecode(taskRes.body);
        final activeData = jsonDecode(activeRes.body);

        state = state.copyWith(
          isOnline: profData['is_online'] ?? false,
          earnings: {
            'today_earnings': earnData['today_earnings'] ?? 0,
            'total_earnings': earnData['total_earnings'] ?? 0,
            'completed_orders': earnData['completed_orders'] ?? 0,
          },
          availableOrders: taskData['tasks'] ?? [],
          activeOrder: activeData['order'],
          clearActiveOrder: activeData['order'] == null,
        );
      }
    } catch (e) {
      print('Fetch error: $e');
    }
  }

  Future<bool> toggleStatus() async {
    if (token == null) return false;
    state = state.copyWith(isLoading: true);

    try {
      final response = await http.patch(
        Uri.parse('${AppConstants.baseUrl}/api/rider/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'is_online': !state.isOnline}),
      );

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        state = state.copyWith(isOnline: data['is_online'], isLoading: false);
        return true;
      }
    } catch (e) {
      state = state.copyWith(error: e.toString(), isLoading: false);
    }
    return false;
  }

  Future<bool> acceptOrder(int deliveryId) async {
    if (token == null) return false;
    try {
      final response = await http.post(
        Uri.parse('${AppConstants.baseUrl}/api/rider/tasks/$deliveryId/accept'),
        headers: {'Authorization': 'Bearer $token'},
      );
      if (response.statusCode == 200) {
        fetchData();
        return true;
      }
    } catch (e) {
      print('Accept error: $e');
    }
    return false;
  }

  Future<bool> updateDeliveryStatus(int deliveryId, String status, {String? pin}) async {
    if (token == null) return false;
    try {
      final response = await http.patch(
        Uri.parse('${AppConstants.baseUrl}/api/rider/deliveries/$deliveryId/status'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'new_status': status, 'pin': pin}),
      );
      if (response.statusCode == 200) {
        fetchData();
        return true;
      } else {
        final data = jsonDecode(response.body);
        state = state.copyWith(error: data['detail']);
      }
    } catch (e) {
      print('Status update error: $e');
    }
    return false;
  }

  Future<void> updateLocation(double lat, double lng) async {
    if (token == null || !state.isOnline) return;
    try {
      await http.patch(
        Uri.parse('${AppConstants.baseUrl}/api/rider/location'),
        headers: {
          'Authorization': 'Bearer $token',
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'lat': lat, 'lng': lng}),
      );
    } catch (e) {
      print('Location update error: $e');
    }
  }
}
