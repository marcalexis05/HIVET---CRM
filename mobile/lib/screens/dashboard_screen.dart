import 'package:animate_do/animate_do.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:lucide_icons/lucide_icons.dart';
import '../core/theme.dart';
import '../providers/auth_provider.dart';
import '../providers/rider_provider.dart';

class DashboardScreen extends ConsumerStatefulWidget {
  const DashboardScreen({super.key});

  @override
  ConsumerState<DashboardScreen> createState() => _DashboardScreenState();
}

class _DashboardScreenState extends ConsumerState<DashboardScreen> {
  int _selectedIndex = 0;

  final List<Widget> _pages = [
    const RiderHome(),
    const RiderOrders(),
    const RiderWallet(),
    const Center(child: Text('Profile')),
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: _pages[_selectedIndex],
      bottomNavigationBar: Container(
        decoration: BoxDecoration(
          color: Colors.white,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withOpacity(0.05),
              blurRadius: 20,
              offset: const Offset(0, -5),
            ),
          ],
        ),
        child: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16.0, vertical: 8),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildNavItem(0, LucideIcons.home, 'Home'),
                _buildNavItem(1, LucideIcons.package, 'Orders'),
                _buildNavItem(2, LucideIcons.wallet, 'Wallet'),
                _buildNavItem(3, LucideIcons.user, 'Profile'),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildNavItem(int index, IconData icon, String label) {
    final isSelected = _selectedIndex == index;
    return GestureDetector(
      onTap: () => setState(() => _selectedIndex = index),
      behavior: HitTestBehavior.opaque,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedContainer(
            duration: const Duration(milliseconds: 300),
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            decoration: BoxDecoration(
              color: isSelected ? AppTheme.accentPeach : Colors.transparent,
              borderRadius: BorderRadius.circular(16),
            ),
            child: Icon(
              icon,
              color: isSelected ? AppTheme.brand : AppTheme.accentBrown.withOpacity(0.4),
              size: 24,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            label,
            style: TextStyle(
              color: isSelected ? AppTheme.brand : AppTheme.accentBrown.withOpacity(0.4),
              fontSize: 10,
              fontWeight: isSelected ? FontWeight.w900 : FontWeight.w500,
            ),
          ),
        ],
      ),
    );
  }
}

class RiderHome extends ConsumerWidget {
  const RiderHome({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authProvider).user;
    final riderState = ref.watch(riderProvider);
    final riderName = user?['first_name'] ?? 'Rider';

    final formatter = NumberFormat.currency(symbol: '₱', decimalDigits: 2);
    final todayEarnings = formatter.format(riderState.earnings['today_earnings'] ?? 0);
    final totalEarnings = formatter.format(riderState.earnings['total_earnings'] ?? 0);

    return SingleChildScrollView(
      physics: const BouncingScrollPhysics(),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(24, 60, 24, 40),
            decoration: const BoxDecoration(
              color: AppTheme.accentBrown,
              borderRadius: BorderRadius.only(
                bottomLeft: Radius.circular(40),
                bottomRight: Radius.circular(40),
              ),
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                  children: [
                    FadeInLeft(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            'OPERATIONAL UNIT: ACTIVE',
                            style: GoogleFonts.outfit(
                              color: AppTheme.brand.withOpacity(0.8),
                              fontSize: 10,
                              fontWeight: FontWeight.w900,
                              letterSpacing: 2,
                            ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            'Hero Rider $riderName',
                            style: const TextStyle(
                              color: Colors.white,
                              fontSize: 24,
                              fontWeight: FontWeight.w900,
                              letterSpacing: -0.5,
                            ),
                          ),
                        ],
                      ),
                    ),
                    FadeInRight(
                      child: GestureDetector(
                        onTap: () => ref.read(riderProvider.notifier).toggleStatus(),
                        child: AnimatedContainer(
                          duration: const Duration(milliseconds: 300),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: riderState.isOnline ? AppTheme.brand : Colors.white.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                            boxShadow: riderState.isOnline ? [
                              BoxShadow(color: AppTheme.brand.withOpacity(0.4), blurRadius: 20, offset: const Offset(0, 10))
                            ] : [],
                          ),
                          child: Icon(
                            LucideIcons.power,
                            color: riderState.isOnline ? Colors.white : Colors.white30,
                            size: 24,
                          ),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 40),
                FadeInUp(
                  child: Container(
                    padding: const EdgeInsets.all(28),
                    decoration: BoxDecoration(
                      color: AppTheme.brand,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.brand.withOpacity(0.3),
                          blurRadius: 30,
                          offset: const Offset(0, 15),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'SESSION REVENUE',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.w900,
                                    letterSpacing: 1.5,
                                  ),
                                ),
                                const SizedBox(height: 4),
                                Text(
                                  todayEarnings,
                                  style: const TextStyle(
                                    color: Colors.white,
                                    fontSize: 32,
                                    fontWeight: FontWeight.w900,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(16),
                              ),
                              child: Text(
                                '${riderState.earnings['completed_orders'] ?? 0} JOBS',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontSize: 10,
                                  fontWeight: FontWeight.black,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 24),
                        Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              const Text(
                                'TOTAL LIFETIME ASSET',
                                style: TextStyle(color: Colors.white60, fontSize: 9, fontWeight: FontWeight.bold),
                              ),
                              Text(
                                totalEarnings,
                                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.black),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.all(24.0),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (riderState.activeOrder != null) ...[
                  const SectionTitle(title: 'LOGISTICS MANIFEST', subtitle: 'Priority Active Mission'),
                  const SizedBox(height: 16),
                  FadeInRight(
                    child: ActiveOrderCard(order: riderState.activeOrder!),
                  ),
                ] else if (riderState.availableOrders.isNotEmpty) ...[
                  const SectionTitle(title: 'AVAILABLE SECTORS', subtitle: 'Nearby Dispatch Opportunities'),
                  const SizedBox(height: 16),
                  ...riderState.availableOrders.map((order) => Padding(
                    padding: const EdgeInsets.only(bottom: 12),
                    child: AvailableOrderCard(order: order),
                  )).toList(),
                ] else ...[
                  const SizedBox(height: 40),
                  Center(
                    child: Column(
                      children: [
                        Icon(LucideIcons.radar, color: AppTheme.accentBrown.withOpacity(0.1), size: 64),
                        const SizedBox(height: 16),
                        Text(
                          'SCANNING FOR OPPORTUNITIES...',
                          style: GoogleFonts.outfit(
                            color: AppTheme.accentBrown.withOpacity(0.3),
                            fontSize: 10,
                            fontWeight: FontWeight.w900,
                            letterSpacing: 2,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class SectionTitle extends StatelessWidget {
  final String title;
  final String subtitle;
  const SectionTitle({super.key, required this.title, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: AppTheme.accentBrown, letterSpacing: -0.5),
        ),
        Text(
          subtitle.toUpperCase(),
          style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppTheme.accentBrown.withOpacity(0.4), letterSpacing: 1),
        ),
      ],
    );
  }
}

class ActiveOrderCard extends ConsumerWidget {
  final Map<String, dynamic> order;
  const ActiveOrderCard({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final status = order['status'];
    final customer = order['customer'] ?? {};
    final clinic = order['clinic'] ?? {};

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(32),
        border: Border.all(color: AppTheme.accentPeach),
        boxShadow: [
          BoxShadow(color: AppTheme.accentBrown.withOpacity(0.03), blurRadius: 20, offset: const Offset(0, 10))
        ],
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: AppTheme.accentPeach,
                  borderRadius: BorderRadius.circular(16),
                ),
                child: const Icon(LucideIcons.package2, color: AppTheme.brand),
              ),
              const SizedBox(width: 16),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order['primary_serial_number'] ?? 'MISSION #${order['delivery_id'] ?? order['id']}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, letterSpacing: -0.5),
                    ),
                    Text(
                      status.toUpperCase(),
                      style: const TextStyle(color: AppTheme.brand, fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 1),
                    ),
                  ],
                ),
              ),
              const Icon(LucideIcons.chevronRight, color: Colors.grey, size: 20),
            ],
          ),
          const SizedBox(height: 24),
          const Divider(height: 1),
          const SizedBox(height: 24),
          _buildLocationRow(LucideIcons.store, 'EXTRACTION POINT', clinic['name'] ?? 'Hi-Vet Site', clinic['address'] ?? ''),
          const SizedBox(height: 20),
          _buildLocationRow(LucideIcons.mapPin, 'DELIVERY TARGET', customer['name'] ?? 'Customer', order['delivery_address'] ?? ''),
          const SizedBox(height: 32),
          ElevatedButton(
            onPressed: () {
              if (status == 'Processing') {
                _showPinDialog(context, ref, order['delivery_id'] ?? order['id']);
              } else {
                ref.read(riderProvider.notifier).updateDeliveryStatus(order['delivery_id'] ?? order['id'], 'Delivered');
              }
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.brand,
              minimumSize: const Size(double.infinity, 60),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
            ),
            child: Text(
              status == 'Processing' ? 'CONFIRM COLLECTION' : 'FINALIZE DROP-OFF',
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w900, letterSpacing: 1),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildLocationRow(IconData icon, String label, String name, String address) {
    return Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(icon, size: 16, color: AppTheme.accentBrown.withOpacity(0.3)),
        const SizedBox(width: 12),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: TextStyle(fontSize: 9, fontWeight: FontWeight.w900, color: AppTheme.accentBrown.withOpacity(0.4), letterSpacing: 1)),
              const SizedBox(height: 2),
              Text(name, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w900, color: AppTheme.accentBrown)),
              Text(address, style: TextStyle(fontSize: 11, fontWeight: FontWeight.w500, color: AppTheme.accentBrown.withOpacity(0.6))),
            ],
          ),
        ),
      ],
    );
  }

  void _showPinDialog(BuildContext context, WidgetRef ref, int deliveryId) {
    final controller = TextEditingController();
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Confirm PIN'),
        content: TextField(
          controller: controller,
          decoration: const InputDecoration(hintText: 'Enter pickup PIN'),
          keyboardType: TextInputType.number,
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('CANCEL')),
          TextButton(
            onPressed: () async {
              final success = await ref.read(riderProvider.notifier).updateDeliveryStatus(deliveryId, 'Picked Up', pin: controller.text);
              if (success) Navigator.pop(context);
            },
            child: const Text('VERIFY'),
          ),
        ],
      ),
    );
  }
}

class AvailableOrderCard extends ConsumerWidget {
  final Map<String, dynamic> order;
  const AvailableOrderCard({super.key, required this.order});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppTheme.accentPeach),
      ),
      child: Column(
        children: [
          Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: AppTheme.accentPeach.withOpacity(0.5),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(LucideIcons.package, size: 20, color: AppTheme.brand),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'TASK #${order['id'].toString().substring(0, 4).toUpperCase()}',
                      style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14),
                    ),
                    Text(
                      'Distance: ${order['distance'] ?? 'Unknown'}',
                      style: TextStyle(color: AppTheme.accentBrown.withOpacity(0.5), fontSize: 10, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),
              Text(
                '₱${order['shipping_fee'] ?? '0'}',
                style: const TextStyle(color: AppTheme.brand, fontWeight: FontWeight.w900, fontSize: 18),
              ),
            ],
          ),
          const SizedBox(height: 16),
          ElevatedButton(
            onPressed: () => ref.read(riderProvider.notifier).acceptOrder(order['id']),
            style: ElevatedButton.styleFrom(
              backgroundColor: AppTheme.accentBrown,
              minimumSize: const Size(double.infinity, 48),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
            ),
            child: const Text('ACCEPT MANIFEST', style: TextStyle(fontSize: 11, fontWeight: FontWeight.black, letterSpacing: 1)),
          ),
        ],
      ),
    );
  }
}

class RiderOrders extends ConsumerWidget {
  const RiderOrders({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    return const Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: Center(child: Text('Orders List Coming Soon')),
    );
  }
}

class RiderWallet extends ConsumerWidget {
  const RiderWallet({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final riderState = ref.watch(riderProvider);
    final formatter = NumberFormat.currency(symbol: '₱', decimalDigits: 2);
    
    return Scaffold(
      backgroundColor: AppTheme.offWhite,
      body: CustomScrollView(
        slivers: [
          SliverAppBar(
            expandedHeight: 200,
            floating: false,
            pinned: true,
            backgroundColor: AppTheme.accentBrown,
            flexibleSpace: FlexibleSpaceBar(
              title: Text('TREASURY', style: GoogleFonts.outfit(fontWeight: FontWeight.w900, fontSize: 16)),
              background: Container(
                decoration: const BoxDecoration(
                  gradient: LinearGradient(
                    colors: [AppTheme.accentBrown, AppTheme.brandDark],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                ),
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(32),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(32),
                      boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 30, offset: const Offset(0, 15))],
                    ),
                    child: Column(
                      children: [
                        Text('LIFETIME ASSET', style: TextStyle(color: AppTheme.accentBrown.withOpacity(0.4), fontSize: 10, fontWeight: FontWeight.black, letterSpacing: 2)),
                        const SizedBox(height: 8),
                        Text(formatter.format(riderState.earnings['total_earnings'] ?? 0), style: const TextStyle(fontSize: 36, fontWeight: FontWeight.w900, color: AppTheme.accentBrown)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 40),
                  const SectionTitle(title: 'TRANSACTION LOGS', subtitle: 'Verified Compensation History'),
                  const SizedBox(height: 20),
                  const Center(child: Text('No transactions yet')),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
