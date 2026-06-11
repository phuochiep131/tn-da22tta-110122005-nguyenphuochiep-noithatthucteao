package com.example.backend.config;

import com.example.backend.security.CustomOAuth2UserService;
import com.example.backend.security.OAuth2SuccessHandler;
import com.example.backend.security.UserDetailsServiceImpl;
import com.example.backend.service.JwtService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    private final JwtService jwtService;
    private final UserDetailsServiceImpl userDetailsServiceImpl;
    private final CustomOAuth2UserService customOAuth2UserService;
    private final OAuth2SuccessHandler oAuth2SuccessHandler;

    @Value("${app.cors.allowed-origins:http://localhost:5173}")
    private String[] allowedOrigins;

    public SecurityConfig(JwtService jwtService, 
                          UserDetailsServiceImpl userDetailsServiceImpl,
                          CustomOAuth2UserService customOAuth2UserService,
                          OAuth2SuccessHandler oAuth2SuccessHandler) {
        this.jwtService = jwtService;
        this.userDetailsServiceImpl = userDetailsServiceImpl;
        this.customOAuth2UserService = customOAuth2UserService;
        this.oAuth2SuccessHandler = oAuth2SuccessHandler;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        JwtAuthenticationFilter jwtFilter = new JwtAuthenticationFilter(jwtService, userDetailsServiceImpl);

        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth

                        .requestMatchers("/api/auth/**").permitAll()
                        .requestMatchers("/oauth2/**").permitAll()
                        .requestMatchers("/login/**").permitAll()
                        .requestMatchers("/uploads/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/upload/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/categories/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/products/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/room-planner/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/payment-methods/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/coupons/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/reviews/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/flash-sales/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/slideshows/public").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/chatbot/**").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api/recommend/**").permitAll()
                        .requestMatchers(HttpMethod.POST, "/api/recommend/track-view").hasAnyRole("USER", "ADMIN")

                        .requestMatchers(HttpMethod.GET, "/api/users/**").hasAnyRole("USER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/users/**").hasAnyRole("USER", "ADMIN")


                        .requestMatchers(HttpMethod.POST, "/api/reviews/**").hasAnyRole("USER", "ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/reviews/**").hasAnyRole("USER", "ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/reviews/**").hasAnyRole("USER", "ADMIN")

                        .requestMatchers(HttpMethod.DELETE, "/api/users/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/categories/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/categories/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/categories/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/products/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/products/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/flash-sales/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/flash-sales/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/flash-sales/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/payment-methods/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/payment-methods/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/payment-methods/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.POST, "/api/coupons/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/coupons/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/coupons/**").hasRole("ADMIN")

                        .requestMatchers(HttpMethod.PUT, "/api/payments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/payments/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/payments/*/status").hasRole("ADMIN")

                        .requestMatchers("/api/slideshows/admin/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.POST, "/api/slideshows/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.PUT, "/api/slideshows/**").hasRole("ADMIN")
                        .requestMatchers(HttpMethod.DELETE, "/api/slideshows/**").hasRole("ADMIN")

                        .requestMatchers("/api/users/profile").authenticated()
                        .anyRequest().authenticated()
                )
                .oauth2Login(oauth2 -> oauth2
                        .userInfoEndpoint(userInfo -> userInfo.userService(customOAuth2UserService))
                        .successHandler(oAuth2SuccessHandler)
                )
                .addFilterBefore(jwtFilter, UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList(allowedOrigins));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"));
        configuration.setAllowedHeaders(Arrays.asList("Authorization", "Content-Type", "x-auth-token"));
        configuration.setAllowCredentials(true);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }

    @Bean
    public BCryptPasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
}
